---
name: deepspace
version: 0.1.0
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

Build real-time collaborative apps on Cloudflare Workers in one package: SQLite-backed Durable Objects, RBAC, WebSocket subscriptions, Better Auth. Scaffolds with sensible defaults — generouted file-based routing, shadcn/ui primitives, Vite + Tailwind v4. Apps deploy to `<name>.app.space`.

This skill targets **`deepspace` and `create-deepspace` v0.3.7** (verify with `npm view deepspace version` if drift is suspected).

## Quickstart — the development lifecycle

CLI commands, in order. Each step is rerunnable. `dev` and `test` rewrite only the **9 SDK-managed keys** in `.dev.vars` (auth + worker URLs + owner JWT + HMAC + debug flag); anything else you add — third-party tokens, custom flags — is preserved verbatim across runs and ships to prod as `secret_text` bindings on `deploy`. See "Login, test, deploy" for the contract.

```bash
# 1. Scaffold (no auth required — npm fetches create-deepspace via npx on demand)
npm create deepspace@latest <app-name>
cd <app-name>
# CLI is non-interactive by default (agent-friendly): omitting <app-name> prints
# usage and exits 1 instead of prompting on stdin. Pass `--interactive` / `-i`
# for the prompt-driven wizard. Probe with `--help` / `-h` (plain stdout, no
# ANSI) or `--version` / `-v` before invoking when scripting.
# Three invocation forms work — the scaffolder is permissive about target state:
#   a) From a parent dir, target does not exist:     creates <app-name>/ fresh.
#   b) From a parent dir, target is near-empty:      scaffolds in-place into <app-name>/.
#   c) From inside the target dir (any near-empty):  scaffolds in-place into cwd; pass `.`
#                                                    to inherit the dir's name (lowercased).
# "Near-empty" = only boilerplate is allowed: .git, .gitignore, .gitattributes,
# .github/, LICENSE*, README*, any *.md, .vite, .wrangler, .dev.vars, .DS_Store.
# Anything else triggers `Directory <name> already exists` and the scaffolder bails.
# `.git` is allowed but not required — empty / unversioned dirs scaffold fine,
# and a trailing `git init` runs only when no `.git` exists yet.

# 2. One-time login — opens browser, polls up to 10 minutes
npx deepspace login
# 2a. Non-interactive alternative for CI / headless agents:
npx deepspace login --email <e> --password <p>

# 3. Local dev (Vite + worker in-process; HMR on localhost:5173, --strictPort fails loudly on clash)
npx deepspace dev                  # default
npx deepspace dev --port 5180      # parallel apps
npx deepspace dev --prod           # same UI, but workers point at production
# 3a. Clean up leaked workerd/vite (your own — never a sibling session's):
npx deepspace kill                 # kills listener on 5173 + its workerd children
npx deepspace kill --port 5180     # different port
npx deepspace kill --all           # sweeps every workerd/wrangler/vite on the box

# 4. Provision test accounts (one-time per machine; pool is shared across all apps, hard cap of 10)
npx deepspace test-accounts list                        # check what's already there
npx deepspace test-accounts create --email <…@deepspace.test> --password <p> --name <n>

# 5. Run tests (auto-installs Playwright + chromium on first run; always uses dev workers)
npx deepspace test                 # default suite (smoke + api)
npx deepspace test e2e             # all Playwright specs
npx deepspace test unit            # vitest
# 5a. Capture a Playwright screenshot of any URL (shares the same chromium install as `test`).
npx deepspace screenshot http://localhost:5173/ out.png
npx deepspace screenshot http://localhost:5173/ out.png --full-page --wait-for-timeout 500

# 6. Install scaffold features
npx deepspace add --list           # discover available features (18 ship out of the box)
npx deepspace add --info <name>    # see what a feature installs
npx deepspace add <feature>        # install into current app

# 7. Discover & test platform integrations from the CLI
# Discovery is free (no login, no app dir, no dev server) — agents can probe the
# catalog cold. Only `invoke <ep> --body` actually calls the endpoint and is
# billed to the logged-in user.
npx deepspace integrations list                            # NO AUTH — full catalog (31 integrations, 215 endpoints)
npx deepspace integrations info openai/chat-completion     # NO AUTH — schema + example body for one endpoint
npx deepspace invoke openai/chat-completion --body '{...}' # AUTH REQUIRED — actually call it (billed to caller)
npx deepspace invoke openai/chat-completion --body-file -  # AUTH REQUIRED — body via stdin (cat req.json | …)
# `npx deepspace invoke --list` and `--info` are aliases for the no-auth forms above.

# 8. Deploy (subdomain comes from wrangler.toml's `name` field — rename there, not at deploy time)
npx deepspace deploy               # → <wrangler.name>.app.space

# 9. (Optional) Buy & attach a custom domain to the deployed app
npx deepspace domain search <query>          # find available domains and prices
npx deepspace domain buy <domain>            # buy via Stripe Checkout (browser opens)
npx deepspace domain list                    # list domains you own
npx deepspace domain attach <domain> --app <name>   # re-point a domain at a different app
```

**Login state is shared across all apps on the machine.** One `deepspace login` covers `dev`, `test-accounts`, and `deploy` for any app. Probe login state with `npx deepspace whoami` (`--json` for agents); don't stat `~/.deepspace/session` — that's a CLI implementation detail. Re-login only when `whoami` reports not-signed-in or the session has expired. See "Login, test, deploy" below for the full contract.

### Scaffolding from a local SDK checkout (DeepSpace team only)

For testing unreleased SDK changes. End users should always use `npm create deepspace@latest`.

```bash
# Local SDK (for development — replace path with your local SDK root).
# Requires a built dist/ — run `pnpm build` in <local-sdk-path>/packages/deepspace first.
<local-sdk-path>/packages/create-deepspace/dist/index.js <app-name> --local <local-sdk-path>
```

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
| `worker.ts` | Hono app worker; `__DO_MANIFEST__` declares 5 DO classes (`AppRecordRoom`, `AppYjsRoom`, `AppCanvasRoom`, `AppPresenceRoom`, `AppCronRoom`). AI chat routes live in `src/ai/chat-routes.ts` (registered via `registerAiChatRoutes(app, resolveAuth)`) — edit there, not here. Edit `worker.ts` itself when adding new DO classes / WebSocket routes, customizing `AppRecordRoom` options, adding custom HTTP routes, or wiring cross-app proxies. |
| `wrangler.toml` | Cloudflare config. `name` becomes the `<name>.app.space` subdomain — must match `^[a-z0-9](?:-?[a-z0-9])+$` (2-63 chars, lowercase). `run_worker_first = ["/api/*", "/ws/*", "/internal/*", "/v1/*"]` — `/v1/*` is included by default so OpenAI-compatible routes mounted in `worker.ts` resolve before the SPA fallback. Declare custom Cloudflare bindings here (vectorize / r2 / kv / d1 / queue / ai / browser_rendering / hyperdrive / analytics_engine); use `"auto"` as the id to auto-provision. → `references/bindings.md`. |
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
| `src/ai/tools.ts` | System prompt + tool allowlist for `/api/ai/chat`. Tools are **not read-only** by default — the scaffold ships `records.create` / `records.update` / `records.delete` alongside reads. Per-collection RBAC at the DO is the actual security boundary; trim the allowlist if you want a stricter assistant. |
| `src/ai/chat-routes.ts` | Hono handlers for the 4 AI chat endpoints (`POST /api/ai/chats`, `PATCH /api/ai/chats/:id`, `DELETE /api/ai/chats/:id`, `POST /api/ai/chat` — the streaming turn). Edit to switch model/provider, change context-window compaction, or extend the tool surface. |
| `tests/` | Playwright `smoke.spec.ts` / `api.spec.ts` / `collab.spec.ts` + `playwright.config.ts`. |

## Build a new app

Steps run in dependency order. Each links its deep-dive reference; load that reference only when you reach the step.

1. **Scaffold** — see Quickstart.
2. **Schemas** — define collections with `name`, `columns`, `permissions`. Add to `src/schemas/`, register in `src/schemas.ts` alongside `usersSchema` + `settingsSchema` (never replace those). For messaging, also add `CHANNELS_SCHEMA` / `MESSAGES_SCHEMA` / `REACTIONS_SCHEMA` from `deepspace/worker`. → `references/schemas.md`
3. **Cross-app data sharing?** — if the app needs to read/write `workspace:*`, `dir:*`, or `conv:*` scopes shared across DeepSpace apps (e.g., the email-handle workspace, cross-app inbox), the scaffolded `/ws/:roomId` handler routes everything to the local DO and won't see shared data. Add the `PLATFORM_WORKER` proxy edit. → `references/architecture.md` § Cross-app shared scopes. Skip otherwise.
4. **Auth model** — pick public, gated, or **mixed** (the default; gated routes drop into `src/pages/(protected)/`). → `references/auth.md`
5. **Theme** — pick a preset on `<html data-theme="...">` in `index.html`, update `<title>`/favicon. **Don't ship the default `slate`.** → `references/uiux.md` §2
6. **Pages and features** — pages in `src/pages/`. 18 ready features in `.deepspace/features/`; install with `npx deepspace add <feature>` (use `--list` to enumerate). → `references/uiux.md` for UI primitives.
7. **Tests** — extend `smoke.spec.ts` / `api.spec.ts` / `collab.spec.ts` per the Step 8 checklist in `references/testing.md`.
8. **Deploy** — `npx deepspace deploy`. Pre-deploy checklist: home replaced, theme picked, browser-default primitives removed, toasts wired to mutations. → `references/uiux.md` §5

For maintenance work on an existing app, jump straight to the relevant reference.

## Frontend hooks

The three hooks every app uses. For everything else (messaging, directory, R2, Yjs, presence, canvas, cron monitor, theme, env), see `references/sdk-reference.md`.

```typescript
const { records, status } = useQuery<Item>('items', { where: { status: 'published' }, orderBy: 'createdAt' })
const { create, put, remove } = useMutations<Item>('items')   // create returns Promise<string> (the new recordId — capture it)
const { isSignedIn, isLoaded } = useAuth()                    // primary auth check
```

**Each record is an envelope** — `{ recordId, data: T, createdBy, createdAt, updatedAt }`. User fields live under `.data` (`r.data.title`, never `r.title`). Pass `r.recordId` to `put` / `remove`.

**`put` accepts `Partial<T>`** — server merges into the existing row (`{...existing, ...patch}`), so send only the fields you're changing (`put(id, { completed: true })`, not the whole spread). `create` still requires the full `T`.

For exact type signatures, read `node_modules/deepspace/dist/index.d.ts` (frontend) or `node_modules/deepspace/dist/worker.d.ts` (worker). Do not guess hook names or argument shapes.

## Worker-side extensions

Three independent surfaces. Load only what you need:

- **Server actions** (privileged writes that bypass caller RBAC) → `references/server-actions.md`
- **AI chat** (streamed Claude / OpenAI / Cerebras with multi-turn tool use, persistent chat history, context-window compaction) → `references/ai-chat.md`
- **Cron** (scheduled tasks via `AppCronRoom` + `useCronMonitor`) → `references/cron.md`
- **Custom bindings & metering** (Vectorize, AI, R2, KV, D1, Queues, Hyperdrive; `"auto"` autoprovisioning; `runMigrations` for D1; `meterAi` / `meterVectorize` per-tenant rollup via the auto-attached `USAGE_EVENTS` AE dataset) → `references/bindings.md`

Skip all of these for apps that only need client hooks and `integration.post(...)`.

## Integrations

Call external APIs through the api-worker proxy:

```typescript
import { integration } from 'deepspace'
const result = await integration.post('openweathermap/geocoding', { q: city })
// Returns: { success: true, data: {...} } or { success: false, error: "..." }
```

**Endpoint names are two segments: `<integration>/<endpoint>`.** Don't guess — names like `geocode-city` or `weather-forecast` aren't real and return 404 at runtime. Verify with `npx deepspace invoke --list` (full catalog) or look up in `assets/integrations/index.yaml`.

**To discover the body shape for an endpoint** (the most common stumble for integration-heavy apps), run:

```bash
npx deepspace invoke <integration>/<endpoint> --info        # prints input schema + example body
npx deepspace invoke <integration>/<endpoint> --body '{...}' # actually call it, see real response
```

This is the agent-friendly path — both commands print machine-readable JSON with `--json`, and the schema returned by `--info` is the same Zod schema the api-worker validates against. Prefer it over guessing the body shape from endpoint names.

**Auth-gate any UI that calls `integration.post(...)`.** Default billing is owner-pays. The api-worker accepts anonymous callers, so a public endpoint silently bills the owner for every visitor (or bot) hit. Wrap calling components in `useAuth().isSignedIn`.

**Any `integration.post(...)` call requires an `api.spec.ts` extension** that POSTs to `/api/integrations/<endpoint>` and asserts `success: true` with the data shape the UI consumes. This catches wrong endpoint names — the most common integration-heavy-app failure. See `references/integrations.md` and the Step 8 checklist in `references/testing.md`.

## Login, test, deploy

### Login (`npx deepspace login`)

**`npx deepspace whoami`** is the canonical login-state probe (add `--json` from agents). It refreshes the JWT in the same call path that `dev` / `test` / `deploy` use — if `whoami` succeeds, those will too. On failure: stderr `Not logged in. Run \`deepspace login\`.`, exit 1.

`dev` / `test` / `deploy` themselves require a valid session at `~/.deepspace/session`; if absent, they exit with `Not logged in. Run \`deepspace login\` first.` Five hard rules:

1. **Pause and tell the user.** Login opens a browser tab (GitHub/Google OAuth) on their machine and polls up to 10 minutes. They need to be at the keyboard.
2. **For CI / headless agent runs**, use `npx deepspace login --email <e> --password <p>` instead — the non-interactive path bypasses OAuth polling entirely. **Test-account fixtures only.** This flag is *not* a credential-handling path for real user accounts — real users always use the interactive `deepspace login` (browser OAuth, never sees a password). The `--password` path exists specifically so headless agents can sign in as a shared test-account fixture provisioned via `npx deepspace test-accounts create`. Those test accounts are scoped to the dev-tier pool (cap 10 per machine), have no production data or real billing attached, and a leaked test-account password only lets an attacker use a test account. Do not invent credentials or ask the user to share their personal password.
3. **Run interactive login without an artificial time bound.** **Do not** wrap in `timeout N`, `sleep N && kill`, or any cutoff — those terminate OAuth before completion and leave no session. (`timeout` isn't installed on macOS by default; don't reach for it.) Run in foreground or a true background process.
4. **After login completes, verify with `npx deepspace whoami`** before retrying `dev` / `test` / `deploy`. Re-running them while login is still polling produces the same error — that's expected order, not a bug.
5. **Never copy `.dev.vars` from a sibling app.** `APP_OWNER_JWT` is minted against that app's wrangler name; borrowing causes silent auth mismatches.

### Test (`npx deepspace test`)

Tests are the primary way to verify code changes. The scaffolded specs (`smoke.spec.ts` / `api.spec.ts` / `collab.spec.ts`) are starting points — extend them per the Step 8 checklist in `references/testing.md`. The full extension table, debug-from-failures rule, route coverage, multi-user patterns, and the `'deepspace/testing'` fixture all live in that file.

**One rule stays here because it bites first-time runs:** run tests only after a runtime-affecting code change (`src/`, `worker.ts`, etc.). Skip them for conversation, planning, reading, or pure documentation edits — don't run as a ritual.

### Deploy (`npx deepspace deploy`)

On an **initial build**, run the pre-deploy checklist in `references/uiux.md` §5 first. On follow-up deploys with those already verified, just run the command:

```bash
npx deepspace deploy   # → <wrangler.name>.app.space
```

The subdomain is the `name` field in `wrangler.toml`. Edit it there if you want a different deploy target — `deploy` does not accept a name override. Re-run `npx deepspace login` if the session has expired.

## `.dev.vars` contract

`dev` / `test` rewrite **only the 9 SDK-managed keys**: `AUTH_JWT_PUBLIC_KEY`, `AUTH_JWT_ISSUER`, `AUTH_WORKER_URL`, `API_WORKER_URL`, `PLATFORM_WORKER_URL`, `OWNER_USER_ID`, `APP_OWNER_JWT`, `INTERNAL_STORAGE_HMAC_SECRET`, `ALLOW_DEBUG_ROUTES`. They live above a `# --- not managed by the SDK; preserved across dev/test runs ---` divider the CLI writes itself.

Anything you add **below** that divider — third-party API tokens, custom feature flags, your own service URLs — is preserved verbatim across `dev` / `test` runs, **and shipped to prod as `secret_text` bindings on `deploy`** (same `env.MY_KEY` access pattern in dev and prod; no `wrangler secret put` step).

Limits enforced server-side at deploy:
- Name must match `^[A-Za-z_][A-Za-z0-9_]*$`.
- Per-value cap: **32 KB** (32 × 1024 bytes).
- Total cap across all user secrets: **128 KB**.
- Raw JSON payload cap: **1 MB** → 413.
- Name must not collide with `RESERVED_BINDING_NAMES` (12 SDK-owned), any declared custom binding, or any DO class in `__DO_MANIFEST__`.

Read `references/bindings.md` if any of those collisions trip you.

## References

Each reference declares its own "Load when …" trigger at the top. Index:

| Reference | Load when |
|---|---|
| `references/sdk-reference.md` | Looking up any hook, type, or export — the canonical index of every public surface (frontend, worker, testing). |
| `references/schemas.md` | Defining a collection, picking a permission rule, debugging "why can't this user see/edit X," wiring `visibilityField` / `collaboratorsField`. |
| `references/auth.md` | Choosing the auth model (public / gated / mixed), adding `<AuthGate>`, customizing the sign-in fallback. |
| `references/architecture.md` | Editing `worker.ts`, adding cross-app shared scopes (`workspace:*` / `dir:*` / `conv:*`), wiring `platformWorkerFetch`, understanding the WebSocket / `/api/*` identity-strip security model. |
| `references/server-actions.md` | Adding privileged writes that bypass the caller's RBAC. |
| `references/ai-chat.md` | Adding a streamed chat UI with tool use over the app's records. |
| `references/cron.md` | Adding scheduled tasks, building the admin cron monitor, testing cron via `trigger`. |
| `references/bindings.md` | Declaring custom Cloudflare bindings (Vectorize / R2 / KV / D1 / Queues / AI / Browser / Hyperdrive / AE), `"auto"` autoprovisioning, D1 bootstrap with `runMigrations`, per-tenant cost rollup via `meterAi` / `meterVectorize` / `meterUsage`. |
| `references/integrations.md` | Calling external APIs (LLMs, search, media, social, finance, etc.). |
| `references/domain.md` | Buying / attaching / managing a custom domain (`deepspace domain` CLI). Skip for apps that are happy on `<name>.app.space`. |
| `references/integrations/livekit.md` | Adding audio/video rooms — token mint, billing model, room lifecycle. |
| `references/integrations/google-oauth.md` | Calling Gmail / Calendar / Drive — per-user billing, scope step-up, `requiresOAuth` retry, test mocks. |
| `references/uiux.md` | Working on theme, home page, primitives, interaction polish, or "feels generic" feedback. Trigger especially when about to use `<select>` / `window.confirm` / `window.alert` / `window.prompt`. |
| `references/testing.md` | Writing or extending specs, applying the Step 8 checklist, building multi-user flows, route coverage, debugging flaky tests. |
| `references/landing-design.md` | Building marketing / landing / splash pages, addressing "feels AI-generated" feedback, customizing the scaffolded `landing` feature. |

## Gotchas

Cross-cutting traps that don't have a natural reference home. Domain-specific gotchas live in their topical reference (auth, schemas, integrations, architecture, testing, bindings).

- **`useAuth().isSignedIn` for auth checks** — `useUser()` loads async; gating on it produces a flash of "not signed in." Full rules and the rest of the auth gotchas live in `references/auth.md`.
- **Scaffold's local UI primitives shadow the SDK** — `_app.tsx` wraps the tree in `ToastProvider` from `src/components/ui/`, not from `deepspace`. Importing `useToast` (or any locally-shadowed primitive) from `deepspace` throws `useToast must be used within ToastProvider` at runtime — the React contexts don't match. **Import from `../components/ui`, not from `deepspace`.** Full explanation in `references/uiux.md` § "Critical import rule."
- **Page files belong in `src/pages/`** — generouted scans only this directory. Putting pages in `src/features/<name>/` results in 404s even if nav links exist.
- **Never put identity in WebSocket URLs or `/api/*` headers.** The starter `wsRoute` strips `userId` / `userName` / `userEmail` / `userImageUrl` / `role` query params on every upgrade and re-applies them only from a verified JWT. The platform worker does the same on `/api/*` (overwrites `X-User-Id` from JWT, strips `X-App-Action`). Caller identity is **always** the JWT subject — there is no client-side override. Three valid WS states: no token → anonymous (DO assigns `anon-<uuid>`); invalid token → 401; valid token → JWT identity. (Cross-app scopes `workspace:*` / `dir:*` / `conv:*` have no anonymous path — auth is required.)
- **Port 5173 may be held by a parallel session** — `tests/playwright.config.ts` ships with `reuseExistingServer: true`, so a sibling session's Vite on 5173 is picked up and your tests run against **its** app. **Do not kill a parallel session's processes.** For your own leaked workerd/wrangler (crashed terminal, IDE close), use `npx deepspace kill` (add `--all` to sweep every workerd/wrangler/vite on the box). For genuine parallel work, use `--port 5174` (or 5175, 5176, …) and edit `tests/playwright.config.ts` so `webServer.port` and `use.baseURL` both match before running tests.
