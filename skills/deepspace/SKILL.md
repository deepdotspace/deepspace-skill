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
  rooms, or one-package deploy to `.app.space` — even if they don't name
  DeepSpace explicitly.
---

# DeepSpace SDK

Build real-time collaborative apps on Cloudflare Workers in one package: SQLite-backed Durable Objects, RBAC, WebSocket subscriptions, Better Auth. Scaffolds with sensible defaults — generouted file-based routing, shadcn/ui primitives, Vite + Tailwind v4. Apps deploy to `<name>.app.space`.

This skill targets **`deepspace` and `create-deepspace` v0.2.4** (latest published on npm at the time this skill was written).

## Quickstart — the development lifecycle

CLI commands, in order. Each step is rerunnable; only `login` needs the user at the keyboard.

```bash
# 1. Scaffold (no auth required — npm fetches create-deepspace via npx on demand)
npm create deepspace@latest <app-name>
cd <app-name>

# 2. One-time login — opens browser, polls up to 10 minutes
npx deepspace login

# 3. Local dev (Vite + workers + HMR on localhost:5173)
npx deepspace dev                  # default
npx deepspace dev --port 5180      # parallel apps (uses --strictPort, fails loudly on clash)
npx deepspace dev --prod           # same UI, but workers point at production

# 4. Run tests (auto-installs Playwright + chromium on first run)
npx deepspace test                 # default suite (smoke + api)
npx deepspace test e2e             # all Playwright specs
npx deepspace test unit            # vitest

# 5. Deploy
npx deepspace deploy               # → <app-name>.app.space
```

**Login state is shared across all apps on the machine.** One `deepspace login` covers `dev`, `test-accounts`, and `deploy` for any app. Re-login only when `~/.deepspace/session` is wiped or the session expires. See "Login, test, deploy" below for non-obvious rules.

## Two imports

```typescript
// Frontend (React)
import { RecordProvider, RecordScope, useQuery, useMutations, useAuth } from 'deepspace'

// Worker (Cloudflare Worker)
import { RecordRoom, verifyJwt, CHANNELS_SCHEMA } from 'deepspace/worker'
```

A third entry point — `'deepspace/testing'` — exports a Playwright fixture for multi-user specs. See `references/testing.md`.

## Project layout

The scaffold generates a Vite + Cloudflare-Worker app. Files you'll touch most often:

| Path | Purpose |
|---|---|
| `worker.ts` | Hono app worker; `__DO_MANIFEST__` declares 5 DO classes (`AppRecordRoom`, `AppYjsRoom`, `AppCanvasRoom`, `AppPresenceRoom`, `AppCronRoom`). Edit only when adding cross-app proxies. |
| `src/pages/_app.tsx` | Provider stack: `ToastProvider → DeepSpaceAuthProvider → AuthBoot → RecordProvider → RecordScope`. **Extend, don't replace.** |
| `src/pages/` | File-based routes via generouted. `(protected)/` is the gated route group. |
| `src/schemas.ts` + `src/schemas/` | Collection schemas. Ships `usersSchema` + `settingsSchema`. |
| `src/themes.ts` + `src/themes.css` | 15 theme presets; active one set on `<html data-theme>` in `index.html`. |
| `src/styles.css` | Tailwind v4 entry; `@theme` block holds the slate baseline. |
| `src/nav.ts` | Top-nav entries — add new pages here so `Navigation.tsx` picks them up. |
| `src/constants.ts` | `APP_NAME`, `SCOPE_ID = "app:${APP_NAME}"`, role re-exports. |
| `src/actions/index.ts` | Server-action handlers. |
| `src/cron.ts` | Scheduled tasks for `AppCronRoom`. |
| `src/integrations.ts` | Per-integration billing config (`developer` vs `user`). |
| `src/ai/tools.ts` | System prompt + read-only tools for `/api/ai/chat`. |
| `tests/` | Playwright `smoke.spec.ts` / `api.spec.ts` / `collab.spec.ts` + `playwright.config.ts`. |

## Build a new app

Steps run in dependency order. Each links its deep-dive reference; load that reference only when you reach the step.

1. **Scaffold** — see Quickstart.
2. **Schemas** — define collections with `name`, `columns`, `permissions`. Add to `src/schemas/`, register in `src/schemas.ts` alongside `usersSchema` + `settingsSchema` (never replace those). For messaging, also add `CHANNELS_SCHEMA` / `MESSAGES_SCHEMA` / `REACTIONS_SCHEMA` from `deepspace/worker`. → `references/schemas.md`
3. **Auth model** — pick public, gated, or **mixed** (the default; gated routes drop into `src/pages/(protected)/`). → `references/auth.md`
4. **Theme** — pick a preset on `<html data-theme="...">` in `index.html`, update `<title>`/favicon. **Don't ship the default `slate`.** → `references/uiux.md` §2
5. **Pages and features** — pages in `src/pages/`. 18 ready features in `.deepspace/features/`; install with `npx deepspace add <feature>`. → `references/uiux.md` for UI primitives.
6. **Tests** — extend `smoke.spec.ts` / `api.spec.ts` / `collab.spec.ts` per the checklist below.
7. **Deploy** — `npx deepspace deploy`. Pre-deploy checklist: home replaced, theme picked, browser-default primitives removed, toasts wired to mutations. → `references/uiux.md` §5

For maintenance work on an existing app, jump straight to the relevant reference.

## Frontend hooks

The data-and-identity primitives every app uses. For other hooks (R2 files, Yjs, presence, canvas, theme, env), see "References" below.

### Core

```typescript
const { records } = useQuery<Item>('items', { where: { status: 'published' }, orderBy: 'createdAt' })
// Each record is an envelope: { recordId, data: { ...your Item fields }, createdBy, createdAt, updatedAt }.
// Access fields through `.data`, never flat: records.map(r => <li key={r.recordId}>{r.data.title}</li>)
// To edit: pass r.recordId to put/remove — put(r.recordId, { ...r.data, title: 'new' })
const { create, put, remove } = useMutations<Item>('items')
// `create` returns Promise<string> (the new recordId — capture for navigation):
//   const id = await create({ title: 'New' }); navigate(`/items/${id}`)
// `put` / `remove` return Promise<void>. Use createConfirmed / putConfirmed / removeConfirmed
// when you must wait for server ack (read-after-write); the plain ones resolve after
// the optimistic local apply.
const { user } = useUser()          // storage-level: id, name, email, role
const { isSignedIn } = useAuth()    // auth state — primary check (session-based, updates immediately)
const { users } = useUsers()        // all room users
```

### Messaging (channel-based)

```typescript
const { channels, create } = useChannels()
const { messages, send, edit, remove } = useMessages(channelId)
const { getReactionsForMessage, toggle } = useReactions(channelId)
const { isMember, join, leave } = useChannelMembers(channelId)
const { markAsRead, getUnreadCount } = useReadReceipts()
```

### Directory (cross-app)

```typescript
const { conversations, createChannel, createDM } = useConversations()
const { communities, createCommunity, joinCommunity } = useCommunities()
const { posts, createPost } = usePosts()
```

For exact type signatures of any export, read `node_modules/deepspace/dist/index.d.ts` (frontend) or `node_modules/deepspace/dist/worker.d.ts` (worker). Do not guess hook names or argument shapes.

## Worker-side extensions

Three independent surfaces. Load only what you need:

- **Server actions** (privileged writes that bypass caller RBAC) → `references/server-actions.md`
- **AI chat** (streamed Claude / OpenAI / Cerebras with read-only tool use) → `references/ai-chat.md`
- **Cron** (scheduled tasks via `AppCronRoom` + `useCronMonitor`) → `references/cron.md`

Skip all three for apps that only need client hooks and `integration.post(...)`.

## Integrations

Call external APIs through the api-worker proxy:

```typescript
import { integration } from 'deepspace'
const result = await integration.post('openweathermap/geocoding', { q: city })
// Returns: { success: true, data: {...} } or { success: false, error: "..." }
```

**Endpoint names are two segments: `<integration>/<endpoint>`.** Don't guess — names like `geocode-city` or `weather-forecast` aren't real and return 404 at runtime. Verify in `references/integrations.yaml` before calling.

**Auth-gate any UI that calls `integration.post(...)`.** Default billing is owner-pays. The api-worker accepts anonymous callers, so a public endpoint silently bills the owner for every visitor (or bot) hit. Wrap calling components in `useAuth().isSignedIn`.

## Login, test, deploy

### Login (`npx deepspace login`)

The first run of `dev`/`test`/`deploy` requires a stored session at `~/.deepspace/session`. If absent, the command exits with `Not logged in. Run \`deepspace login\` first.` Four hard rules:

1. **Pause and tell the user.** Login opens a browser tab (GitHub/Google OAuth) on their machine and polls up to 10 minutes. They need to be at the keyboard.
2. **Run login without an artificial time bound.** **Do not** wrap in `timeout N`, `sleep N && kill`, or any cutoff — those terminate OAuth before completion and leave no session. (`timeout` isn't installed on macOS by default; don't reach for it.) Run in foreground or a true background process.
3. **Wait for `~/.deepspace/session` to exist** before retrying `dev` / `test` / `deploy`. Re-running while login is still polling produces the same error — that's expected order, not a bug.
4. **Never copy `.dev.vars` from a sibling app.** `APP_OWNER_JWT` is minted against that app's wrangler name; borrowing causes silent auth mismatches. Let `dev` regenerate it.

### Test (`npx deepspace test`)

Tests are the primary way to verify code changes. Scaffolded specs (`smoke.spec.ts` / `api.spec.ts` / `collab.spec.ts`) are **starting points** — extend them, don't replace them.

**Run tests only after a runtime-affecting code change** (`src/`, `worker.ts`, etc.). Skip them for conversation, planning, reading, or pure documentation edits — don't run as a ritual.

**Extension checklist — each row is a hard requirement:**

| Trigger | Required test |
|---|---|
| Added a schema | `smoke.spec.ts` — CRUD happy path (create → read → edit → delete for a signed-in user) |
| Added/edited a route, page, nav item, or top-level UI (landing, gallery, dashboard, settings) | `smoke.spec.ts` — page-load with **real-content** assertion (not just "no crash"). For `(protected)/` routes: also assert two-state (signed-out → `[data-testid="auth-overlay"]` visible **and** content not in DOM; signed-in → content visible, no overlay). For public routes: `[data-testid="auth-overlay"]` count is `0`. |
| Schema with `visibilityField` or `'public'`/`'shared'`/`'team'`/`'own'` permissions | `collab.spec.ts` — two-user assertion (A acts, B sees) |
| Used `useYjs*` / `useMessages` / `useReactions` / `usePresence` / `useCanvas` | `collab.spec.ts` — two-user assertion |
| Added/edited worker route, server action, `/api/ai/chat`, cron handler, `integration.post(...)`, or auth-gated UI calling `/api/actions/<name>` | `api.spec.ts` — status codes + response shape + auth gating (incl. 401/403 negative path). For integrations: POST and assert `success: true` with the shape the UI consumes — locks the contract, catches wrong endpoint names. |
| Fixing a bug | Write a failing test that reproduces it **first**, then fix until it passes. Leave the test in place. |

**Workflow rules:**

- **Debug from failures, not console logs.** Read the assertion + selector, fix the code. Don't add `console.log` to diagnose — write a more specific assertion. Don't weaken or delete tests to make them green.
- **Re-run after each follow-up change.** Re-apply the checklist; tests are a living contract.

Skipping the checklist when its conditions fire is the most common cause of "I built it but it crashes on page load" handoffs and "looks fine for me, broken for the second user" regressions.

For the deeper testing surface — `'deepspace/testing'` fixture, the test-account pool rules, route coverage, multi-user patterns, self-diagnosis — load `references/testing.md`.

### Deploy (`npx deepspace deploy`)

On an **initial build**, run the pre-deploy checklist in `references/uiux.md` §5 first. On follow-up deploys with those already verified, just run the command:

```bash
npx deepspace deploy   # → <app-name>.app.space
```

Re-run `npx deepspace login` if the session has expired.

## References

Each reference declares its own "Load when …" trigger at the top. Index:

| Reference | Load when |
|---|---|
| `references/sdk-reference.md` | Looking up any hook, type, or export — the canonical index of every public surface (frontend, worker, testing). |
| `references/schemas.md` | Defining a collection, picking a permission rule, debugging "why can't this user see/edit X," wiring `visibilityField` / `collaboratorsField`. |
| `references/auth.md` | Choosing the auth model (public / gated / mixed), adding `<AuthGate>`, customizing the sign-in fallback. |
| `references/architecture.md` | Editing `worker.ts`, adding cross-app shared scopes (`workspace:*` / `dir:*` / `conv:*`), wiring `platformWorkerFetch`. |
| `references/server-actions.md` | Adding privileged writes that bypass the caller's RBAC. |
| `references/ai-chat.md` | Adding a streamed chat UI with tool use over the app's records. |
| `references/cron.md` | Adding scheduled tasks, building the admin cron monitor, testing cron via `trigger`. |
| `references/integrations.md` | Calling external APIs (LLMs, search, media, social, finance, etc.). |
| `references/integrations/livekit.md` | Adding audio/video rooms — token mint, billing model, room lifecycle. |
| `references/integrations/google-oauth.md` | Calling Gmail / Calendar / Drive — per-user billing, scope step-up, `requiresOAuth` retry, test mocks. |
| `references/uiux.md` | Working on theme, home page, primitives, interaction polish, or "feels generic" feedback. Trigger especially when about to use `<select>` / `window.confirm` / `window.alert` / `window.prompt`. |
| `references/testing.md` | Writing or extending specs, building multi-user flows, applying route coverage, debugging flaky tests. |
| `references/landing-design.md` | Building marketing / landing / splash pages, addressing "feels AI-generated" feedback, customizing the scaffolded `landing` feature. |

## Gotchas

Read before building — concrete biases that will trip you up otherwise, grouped by domain.

### Auth & state

- **`useAuth().isSignedIn`, not `useUser()`** — `isSignedIn` is session-based and updates immediately. `useUser()` loads async and causes a flash of "not signed in" state.
- **Safari + localhost cookies** — `__Secure-` cookies require HTTPS; Safari enforces this on localhost, Chrome doesn't. Auth appears broken on Safari in local dev. Works fine once deployed.
- **JWT provides user profile** — no separate `/api/users/me` call needed.

### Data layer

- **Integration response format** — api-worker returns `{ success: true, data: ... }` where `data` may be a flat array. Don't reach for `result.data.forecast` or `result.data.list` — check `Array.isArray(result.data)` first.
- **`createChannel()` defaults to `Visibility: 'public'`** — every user sees every conversation. Override with `Visibility: 'private'` and set `ParticipantIds` for user-scoped data.
- **Schemas are columns only** — no `fields` property, no document-mode storage.

### Build & runtime

- **Page files belong in `src/pages/`** — generouted scans only this directory. Putting pages in `src/features/<name>/` results in 404s even if nav links exist.
- **Cross-app workspace isolation** — each app worker has its own DO namespace; the scaffolded `/ws/:roomId` handler routes everything to the local DO. `workspace:default` in app A is a different DO instance than `workspace:default` in app B until you add the `PLATFORM_WORKER` proxy edit (see `references/architecture.md`).
- **Scaffold's local UI primitives shadow the SDK** — `_app.tsx` wraps the tree in `ToastProvider` from `src/components/ui/`, not from `deepspace`. Importing `useToast` (or any locally-shadowed primitive) from `deepspace` throws `useToast must be used within ToastProvider` at runtime — the React contexts don't match. **Import from `../components/ui`, not from `deepspace`.** Full explanation in `references/uiux.md` § "Critical import rule."

### Tests

- **All tests use real services** — never mock internal hooks.
- **Port 5173 may be held by a parallel session** — `tests/playwright.config.ts` ships with `reuseExistingServer: true`, so a sibling session's Vite on 5173 is picked up and your tests run against **its** app. **Do not kill** the other session's process. If you need your own dev server, use `--port 5174` (or 5175, 5176, …) and edit `tests/playwright.config.ts` so `webServer.port` and `use.baseURL` both match before running tests.

## Key rules

- **Schemas baked in at deploy time** — no runtime schema loading.
- **Direct WebSocket per scope** — no mux/gateway.
- **No user-scope DOs** — user-scoped data lives in app DOs with RBAC filtering.
- **Use `npx deepspace dev`** for local dev — never run `wrangler dev` + `vite dev` separately.
