# Architecture — DOs, scopes, and cross-app proxies

Load this reference when editing `worker.ts`, adding a new Durable Object class, debugging WebSocket routing, wiring cross-app shared scopes (`workspace:*`, `dir:*`, `conv:*`), or understanding scope-ID conventions. Skip it for pure frontend work or app-scoped data only.

## Per-app DOs

Each app has its own set of Durable Objects with schemas baked in at deploy time. The scaffold declares five DO classes in `__DO_MANIFEST__` and wires them in `worker.ts`: `AppRecordRoom`, `AppYjsRoom`, `AppCanvasRoom`, `AppPresenceRoom`, `AppCronRoom`. (Audio/video uses LiveKit via the `livekit/*` integrations — there is no `MediaRoom` DO.)

```
App Worker (per-app)                 Platform Worker (shared)
├── App{Record,Yjs,Canvas,…}Room    ├── Shared DOs for workspace / dir / conv
├── /ws/:roomId                     └── /api/health
├── /ws/yjs/:docId
├── /ws/canvas/:docId
├── /ws/presence/:scopeId
├── /ws/cron/:roomId                ← admin/monitor stream for AppCronRoom
├── /api/auth/* → auth-worker
├── /api/integrations/* → api-worker
└── Static assets (SPA fallback)
```

The scaffolded `AppRecordRoom` already passes your `schemas` to `RecordRoom` — you rarely need to touch `worker.ts`. The one case where you do is cross-app data sharing (below).

## Scope conventions

- `app:<APP_NAME>` — the app's primary RecordRoom. Default in the scaffold (`SCOPE_ID` in `src/constants.ts`).
- `conv:<id>` — DM/conversation DO. Use with `useConversation` and the `conv_messages` / `conv_reactions` / `conv_members` schemas.
- `workspace:default` — the single shared workspace scope (email handles, teams, etc.) hosted on the platform-worker. There is currently only `default`; the `workspace:` namespace is reserved but not multi-instance.
- `dir:<appHandle>` — per-DeepSpace-app directory DO (cross-app conversations / communities / posts). The `<appHandle>` is the published app's slug (e.g., `dir:deepspace-mail`), not your local `wrangler.toml` `name` — both apps proxy into the platform-worker's directory DO keyed by handle.

## Cross-app workspace isolation

Each app worker has its own DO namespace, and the scaffolded `/ws/:roomId` handler routes everything to that local DO. `workspace:default` in app A is a different DO instance than `workspace:default` in app B until you add the `PLATFORM_WORKER` proxy edit below.

## Cross-app shared scopes

The scaffolded `/ws/:roomId` handler routes **every** scope to the app's own `RECORD_ROOMS` DO. If the app needs to read/write shared scopes (`workspace:*`, `dir:*`, `conv:*`) that must sync across DeepSpace apps, two things need changing:

### 1. Add the service binding to `wrangler.toml` (production)

The scaffold declares `PLATFORM_WORKER?: Fetcher` (and `PLATFORM_WORKER_URL?: string`) in the `Env` interface but does not ship the wrangler binding. Cross-worker calls over plain `*.workers.dev` URLs return Cloudflare error 1042 in production, so the service binding is the only working transport for deployed apps. The `PLATFORM_WORKER_URL` fallback that `deepspace dev` writes into `.dev.vars` is a dev-only convenience — adequate for `wrangler dev`, never enough for prod.

```toml
[[services]]
binding = "PLATFORM_WORKER"
service = "deepspace-platform"   # name of the deployed platform worker
```

### 2. Edit the `/ws/:roomId` handler

Use `platformWorkerFetch` from `deepspace/worker` instead of `c.env.PLATFORM_WORKER.fetch(...)` directly — the helper picks the binding in prod and the URL in dev, so the same code works in both environments:

```typescript
// worker.ts — replace the single-line app.get('/ws/:roomId', wsRoute(...))
import { platformWorkerFetch } from 'deepspace/worker'

app.get('/ws/:roomId', async (c) => {
  const roomId = c.req.param('roomId')
  if (/^(workspace|dir|conv):/.test(roomId)) {
    return platformWorkerFetch(c.env, c.req.raw)
  }
  return wsRoute((env) => env.RECORD_ROOMS)(c)
})
```

Without both edits, `sharedScopes: [{ roomId: 'workspace:default', ... }]` on `<RecordScope>` writes to the app's own DO instead of the platform's shared DO, and cross-app data (e.g., other users' `@app.space` handles) won't appear.

**Cross-app scopes require auth.** The platform worker requires a valid JWT on every WebSocket and `/api/*` upgrade to a cross-app scope — there is no anonymous flow on `workspace:*` / `dir:*` / `conv:*`. Anonymous attempts return 401. (Per-app DOs on the starter `wsRoute` still allow a no-token anonymous connection — see Security model below.)

## Security model — WebSocket and `/api/*` identity

The Durable Object reads caller identity (`userId`, `userName`, `userEmail`, `userImageUrl`, `role`) off the URL it receives and trusts it implicitly. The worker is the only place that can scrub spoofed values, so the starter `wsRoute` and the platform worker both:

1. Delete `userId` / `userName` / `userEmail` / `userImageUrl` / `role` (and the `token`) from the URL on every upgrade.
2. Re-apply identity **only** from the verified JWT (`sub` → `userId`, `name` → `userName`, `email` → `userEmail`, `image` → `userImageUrl`).
3. For `/api/*` passthrough: overwrite `X-User-Id` with the JWT subject and strip `X-App-Action` (only the worker itself sets that header internally for server-action calls).

Three valid states on app-worker WebSockets:
- **No token** → anonymous (DO assigns `anon-<uuid>`). The starter allows this on `/ws/:roomId` and the Yjs / Canvas / Presence / Cron routes.
- **Invalid token** → 401.
- **Valid token** → identity derived from the JWT claims.

The client SDK no longer sends identity params over WS URLs — the worker would strip them anyway. **Do not roll your own WebSocket URL with `userId=…`**, and do not set `X-User-Id` or `X-App-Action` from client code. The api-worker also ignores `X-Billing-User-Id` from end-user JWTs — billing always falls on the JWT subject. (See `references/integrations.md`.)

## App-name rules

The `name` field in `wrangler.toml` is the `<name>.app.space` subdomain. It must match `^[a-z0-9](?:-?[a-z0-9])+$` — lowercase, 2-63 chars, no leading / trailing / double dashes. Names that don't conform are sanitized (lowercased, non-alphanumerics → `-`, consecutive dashes collapsed, leading / trailing dashes stripped) and a warning surfaces at the CLI. The earlier behavior was silent sanitization; the current behavior is the same sanitization but visible — the deployed subdomain still ends up at the sanitized form, so update `wrangler.toml` if you see the warning. Pick the final name before first deploy.

## Upstream proxy helpers

The scaffolded `worker.ts` already uses these for every cross-worker call. **Do not** replace them with raw `c.env.X.fetch(...)` — `wrangler dev` doesn't surface service bindings cross-process for SDK apps, so the binding is `undefined` locally and the fetch silently fails.

- `apiWorkerFetch(env, path, init?)` — fetch the api-worker (binding-preferred, URL fallback)
- `platformWorkerFetch(env, pathOrRequest, init?)` — fetch the platform-worker (binding-preferred, URL fallback). Accepts a `Request` object so you can hand off `c.req.raw` derivatives intact.
- `authWorkerFetch(env, path, init?)` — fetch the auth-worker (URL-only by design — no service binding so `Set-Cookie` headers stay verbatim)

Each helper throws an actionable Error if neither transport is configured. See `references/sdk-reference.md` § Upstream worker proxy helpers for env-interface types and full signatures.

## Key rules

- Schemas baked in at deploy time — no runtime schema loading.
- Direct WebSocket per scope — no mux/gateway.
- No user-scope DOs — user-scoped data lives in app DOs with RBAC filtering.
- **Use `npx deepspace dev`** for local dev — never run `wrangler dev` + `vite dev` separately. The CLI's combined runner is what writes `.dev.vars` (with a freshly-minted `APP_OWNER_JWT`) and routes the app through the Cloudflare Vite plugin so service bindings, DO classes, and WebSocket routes all resolve in-process.
