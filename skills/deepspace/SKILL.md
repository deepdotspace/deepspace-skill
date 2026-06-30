---
name: deepspace
description: >
  Use when building or maintaining real-time collaborative apps with the
  DeepSpace SDK on Cloudflare Workers — scaffolding new apps, adding
  features, debugging a `worker.ts` that imports from `deepspace` /
  `deepspace/worker` or uses `RecordRoom`, `__DO_MANIFEST__`, or `npx
  deepspace`. Also use when the user mentions DeepSpace or app.space, or
  asks for anything involving real-time sync, multiplayer state, live
  cursors / presence, whiteboards or canvases, collaborative text editing
  (Yjs), channel-based chat, per-role permissions (RBAC), Durable Object
  rooms, Stripe-backed subscriptions / paywalls / one-time products /
  tips / refunds, or one-package deploy to `.app.space` — even if they
  don't name DeepSpace explicitly.
---

DeepSpace builds and deploys real-time collaborative apps on Cloudflare Workers in one package — auth, RBAC, live data subscriptions, messaging, payments — and ships them to `<name>.app.space`.

Two hard gates come first: the user must be **logged in**, and the app must be **scaffolded** rather than hand-built.

## 1. Log in first

Every command that *runs* anything — `dev`, `test`, `deploy` — needs a signed-in DeepSpace account. There's no local-only mode: `dev` connects to deployed dev workers.

```bash
npx deepspace whoami     # probe (--json for agents)
npx deepspace login      # only if whoami says signed-out
```

`login` opens a browser OAuth tab and polls up to 10 minutes — **pause and let the user finish it at the keyboard.** Don't wrap it in `timeout` / `sleep` / `kill` (that aborts the OAuth poll), and don't ask for their password. One login covers every app on the machine. Full login + CLI contract → `references/cli.md`.

## 2. Scaffold the app

```bash
npm create deepspace@latest <app-name>   # no login needed; <app-name> seeds the dir AND wrangler `name`
cd <app-name>                            # (= deploy subdomain). Edit it later in wrangler.toml, not by moving the dir.
npx deepspace dev                        # Vite + worker, HMR on localhost:5173
```

The two import surfaces:

```typescript
import { RecordProvider, RecordScope, useQuery, useMutations, useAuth } from 'deepspace'        // frontend
import { RecordRoom, verifyJwt, CHANNELS_SCHEMA } from 'deepspace/worker'                        // worker
```

## 3. Build — discover before you hand-build

Run both catalogs *first thing* in any build — *never* skip on a hunch that nothing fits. The one-line names can't tell you what a block does; only `add --info` / `integrations info` can, so don't rule one out from the list alone.

```bash
npx deepspace add --list           # 16 UI features — landing, topbar, file-manager, kanban, messaging… with auto-wired schema/routes/nav
npx deepspace add --info <feature>    # inspect a feature before installing
npx deepspace add <feature>           # install it
npx deepspace integrations list    # external APIs (weather, LLMs, stocks, sports…) via owner-pays proxy, no keys to manage
```

When you build by hand, where things live (load the matching reference from the table below as you touch each):

| Path | Purpose |
|---|---|
| `src/schemas.ts` + `src/schemas/` | Collection schemas. Ships `usersSchema` (required, don't rename) + `settingsSchema`. |
| `src/pages/` | File routes (generouted). `(protected)/` is the gated group. `_app.tsx` is the provider stack — **extend, don't replace.** |
| `src/themes.ts` + `src/themes.css` | 15 presets, set on `<html data-theme>`. **Don't ship the default `slate`.** |
| `src/constants.ts` | `APP_NAME`, `SCOPE_ID`, role re-exports. |
| `worker.ts` | Hono worker; `__DO_MANIFEST__` declares the DO classes. AI chat routes live in `src/ai/chat-routes.ts`. → `references/architecture.md` |

The three hooks you'll reach for constantly:

```typescript
const { records, status } = useQuery<Item>('items', { where: { status: 'published' }, orderBy: 'createdAt' })
const { create, put, remove } = useMutations<Item>('items')   // create returns the new recordId
const { isSignedIn, isLoaded } = useAuth()
```

Records are envelopes — `{ recordId, data: T, createdBy, createdAt, updatedAt }`. User fields live under `.data` (`r.data.title`, never `r.title`). `put(recordId, patch)` takes a `Partial<T>` and merges server-side. For any other hook (messaging, presence, Yjs, canvas, cron, jobs), read `references/sdk-reference.md` before guessing.

## 4. Test, then deploy

```bash
npx deepspace test       # after runtime-affecting changes; multi-user features need a 2-user spec → references/testing.md
npx deepspace deploy     # → <wrangler.name>.app.space
npx deepspace deploy --env staging   # → isolated staging instance (v0.4+); rehearse risky changes first
npx deepspace kill       # if your own dev port is stuck (never kill a sibling session's)
```

Deploy's subdomain is `wrangler.toml`'s `name`, not the folder. On a **first** deploy, clear the pre-deploy checklist in `references/uiux.md` §5 (real home, theme picked, no browser-default primitives). Deploy mechanics, the `.dev.vars` contract, secret handling, and **multi-env / staging (`--env`, incl. the client-`APP_NAME` sync gotcha)** → `references/deploy.md`. The full CLI catalog (`integrations`, `test-accounts`, `screenshot`, `domain`, `library`, dev/kill flags) → `references/cli.md`.

## Load a reference when you reach its surface

Before editing files, scan this table and `Read` every row whose trigger matches — in the same turn, before the first edit. Each reference also declares its own "Load when…" gate on line 1; that gate is authoritative.

| Reference | Read before |
|---|---|
| `references/cli.md` | The login contract, the full CLI command catalog (`dev`/`kill`/`integrations`/`test-accounts`/`screenshot`/`library`), and the `test` command. |
| `references/deploy.md` | Deploy mechanics, the `.dev.vars` contract, secret handling, and multi-environment / staging deploys (`deploy --env`). |
| `references/sdk-reference.md` | Any hook / type / export beyond `useQuery` / `useMutations` / `useAuth` — messaging, game rooms, presence, Yjs, canvas, R2. Open before `node_modules/deepspace/dist/*.d.ts`. |
| `references/schemas.md` | Defining a collection, picking a permission rule, debugging "why can't this user see/edit X." |
| `references/auth.md` | Choosing the auth model (public / gated / mixed), adding `<AuthGate>`, customizing the sign-in fallback. |
| `references/architecture.md` | Editing `worker.ts`, adding DO classes / cross-app scopes (`workspace:*` / `dir:*` / `conv:*`), the identity-strip security model, app-name rules. |
| `references/server-actions.md` | Privileged writes that bypass the caller's RBAC. |
| `references/ai-chat.md` | A streamed chat UI with tool use over the app's records. |
| `references/cron.md` | Scheduled tasks via `AppCronRoom` + `useCronMonitor`. |
| `references/jobs.md` | Durable background work via `AppJobRoom` + `useJobs` (AI generation, exports, renders). |
| `references/bindings.md` | Custom Cloudflare bindings (Vectorize / R2 / KV / D1 / Queues / AI / Browser / Hyperdrive), `"auto"` autoprovisioning, per-tenant metering. |
| `references/integrations.md` | Calling external APIs through `integration.post(...)` and the discovery CLI. Itself points to `integrations/livekit.md` (audio/video rooms) and `integrations/google-oauth.md` (Gmail / Calendar / Drive / Contacts) when you reach those. |
| `references/payments.md` | Anything involving money — Stripe, paywalls, subscriptions, pricing, "Upgrade" buttons, tips, refunds. **Never hand-roll Stripe.** |
| `references/domain.md` | Buying / attaching / managing a custom domain. |
| `references/uiux.md` | Theme, home page, primitives, "feels generic" feedback. Before `<select>` / `window.confirm` / `window.alert`. |
| `references/testing.md` | Writing/extending specs, multi-user flows, debugging flaky tests. |
| `references/landing-design.md` | Marketing / landing / splash pages. |

## Traps worth knowing up front

- **Scaffold's UI primitives shadow the SDK.** `_app.tsx` uses `ToastProvider` from `src/components/ui/`, not `deepspace`. Importing `useToast` (or any local primitive) from `deepspace` throws at runtime. **Import from `../components/ui`.**
- **Page files belong in `src/pages/`** — generouted scans only there; pages under `src/features/<name>/` 404.
- **Don't kill or assume a clean port 5173.** `tests/playwright.config.ts` ships `reuseExistingServer: true`, so if a sibling session already holds 5173 your tests silently run against *its* app. Don't kill another session's processes — use `npx deepspace dev --port 5174` and match `webServer.port` + `use.baseURL` in the config. → `references/testing.md`
- **Never put identity in WebSocket URLs or `/api/*` headers** — the starter strips `userId`/`role`/etc. and re-applies them only from a verified JWT. Caller identity is always the JWT subject. → `references/architecture.md`
