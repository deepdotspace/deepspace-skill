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

- `app:<APP_NAME>` — the app's primary RecordRoom. Default in the scaffold.
- `conv:<id>` — DM/conversation DO. Use with `useConversation` and the `conv_messages` / `conv_reactions` / `conv_members` schemas.
- `workspace:*` — shared scopes that sync across DeepSpace apps (e.g., the email-handle workspace).
- `dir:*` — directory scopes for cross-app conversations / communities / posts.

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
