---
name: deepspace
description: >
  Use when building real-time collaborative apps with the DeepSpace SDK on
  Cloudflare Workers — scaffolding a new app, adding a feature, or
  maintaining/bug-fixing a project whose `worker.ts` uses `RecordRoom` or
  which imports from `deepspace` or `deepspace/worker`. Also use when the
  user mentions DeepSpace, app.space, RecordRoom, `__DO_MANIFEST__`, or
  `npx deepspace`, or asks to build anything involving real-time sync,
  multiplayer state, live cursors / presence, shared whiteboards or
  canvases, collaborative text or document editing (Yjs), channel-based
  chat, per-role permissions (RBAC), Durable Object rooms, or an app that
  deploys end-to-end to `.app.space` / Cloudflare Workers in one package —
  even if they don't name DeepSpace explicitly.
---

# DeepSpace SDK

Build real-time collaborative apps on Cloudflare Workers. One npm package: SQLite-backed Durable Objects, RBAC, WebSocket subscriptions, Better Auth.

## Build a New App

### Step 1: Scaffold

```bash
# Published SDK (when available)
npm create deepspace <app-name>

# Local SDK (for development — replace path with your local SDK root)
<local-sdk-path>/packages/create-deepspace/dist/index.js <app-name> --local <local-sdk-path>
```

This generates: generouted file-based routing, `_app.tsx` providers, `nav.ts`, `worker.ts`, Cloudflare Vite plugin, and a working dev setup.

### Step 2: Define Schemas

Add one file per collection under `src/schemas/` and register it in `src/schemas.ts`. Every collection needs `name`, `columns`, and `permissions`. The scaffold already ships `usersSchema` — add your own alongside it.

```typescript
// src/schemas/items-schema.ts
import type { CollectionSchema } from 'deepspace/worker'

export const itemsSchema: CollectionSchema = {
  name: 'items',
  columns: [
    { name: 'title', storage: 'text', interpretation: 'plain' },
    { name: 'status', storage: 'text', interpretation: { kind: 'select', options: ['draft', 'published'] } },
  ],
  visibilityField: { field: 'status', value: 'published' },
  permissions: {
    viewer: { read: 'published', create: false, update: false, delete: false },
    member: { read: true, create: true, update: 'own', delete: 'own' },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
```

```typescript
// src/schemas.ts
import type { CollectionSchema } from 'deepspace/worker'
import { usersSchema } from './schemas/users-schema'
import { itemsSchema } from './schemas/items-schema'

export const schemas: CollectionSchema[] = [usersSchema, itemsSchema]
```

For messaging, add `CHANNELS_SCHEMA`, `MESSAGES_SCHEMA`, `REACTIONS_SCHEMA` (and optionally `CHANNEL_MEMBERS_SCHEMA`, `READ_RECEIPTS_SCHEMA`) from `deepspace/worker` to the array.

**Roles and permission keys:**
- Built-in roles are `viewer | member | admin` (see `ROLES`). New authenticated users are `member` by default.
- `ownerField` is only required if you use `'own'`, `'shared'`, or `'team'` permission levels **and** want ownership tied to a column other than the record's creator. Omit it and `'own'` matches `record.createdBy` (from the envelope — no extra column needed).
- To grant permissions to unauthenticated connections, use `'*'` as a wildcard key — there is no built-in `anonymous` role:
  ```typescript
  permissions: {
    '*':    { read: 'published', create: false, update: false, delete: false },
    member: { read: true, create: true, update: 'own', delete: 'own' },
    admin:  { read: true, create: true, update: true, delete: true },
  }
  ```

### Step 3: Providers Are Already Wired — Extend, Don't Replace

The scaffolded `src/pages/_app.tsx` ships the global provider stack. The shape is:

```tsx
// App() returns:
<ToastProvider>                           // from ../components/ui (local, NOT 'deepspace')
  <DeepSpaceAuthProvider>
    <AuthBoot>                            // local helper: shows loader while auth resolves, then mounts data layer
      <Navigation />
      <main><Outlet /></main>
    </AuthBoot>
  </DeepSpaceAuthProvider>
</ToastProvider>

// AuthBoot mounts the data layer for everyone (signed-in OR signed-out):
<RecordProvider allowAnonymous>
  <RecordScope roomId={SCOPE_ID} schemas={schemas} appId={APP_NAME}>
    {children}
  </RecordScope>
</RecordProvider>
```

`AuthBoot` is local to `_app.tsx`. It is **not** the same as the SDK's `<AuthGate>` — it just waits for `useAuth().isLoaded` so the data layer always mounts with valid auth state, and then renders children regardless of sign-in status. Public pages render fine inside it; the data layer is in `allowAnonymous` mode by default.

Do not rewrite `_app.tsx`. The defaults already:
- Wrap the tree in the scaffold's local `ToastProvider` (import `useToast` from `../components/ui`, not `deepspace`).
- Render routes for both signed-in and signed-out users.
- Expose a Sign In button in `Navigation.tsx` that opens `<AuthOverlay onClose={...}/>` (GitHub + Google + email/password) and a sign-out option in the avatar dropdown.

Extend by adding schemas (Step 2), pages (Step 6), and nav entries (`src/nav.ts`). To share data across DeepSpace apps (e.g., the email-handle workspace), pass `sharedScopes` to the existing `<RecordScope>` — but see "Cross-app shared scopes" under Architecture below.

### Step 4: Auth — Three Configurations (Public / Gated / Mixed)

Auth gating is route-scoped via `<AuthGate>` from `'deepspace'`. The scaffold ships the **mixed** config by default (public landing + gated app). Three patterns, pick whichever fits the product:

**1. Fully public** — every page reachable signed-out. Don't import `<AuthGate>` anywhere; rely on `RecordProvider allowAnonymous` (already on by default in `_app.tsx`).

**2. Fully gated** — every page requires sign-in. Wrap the tree in `_app.tsx` with `<AuthGate>` and drop `allowAnonymous`:

```tsx
// src/pages/_app.tsx
<DeepSpaceAuthProvider>
  <AuthGate>
    <RecordProvider>{/* no allowAnonymous — nothing public */}
      <RecordScope ...>
        <Navigation />
        <Outlet />
      </RecordScope>
    </RecordProvider>
  </AuthGate>
</DeepSpaceAuthProvider>
```

**3. Mixed (default)** — public pages live at `src/pages/<name>.tsx`; gated pages go inside the `(protected)/` generouted route group. The scaffolded `src/pages/(protected)/_layout.tsx` applies `<AuthGate>` once for everything inside:

```
src/pages/
  home.tsx                  ← public (/home)
  landing.tsx               ← public (/landing)
  (protected)/
    _layout.tsx             ← <AuthGate><Outlet /></AuthGate>
    settings.tsx            ← gated (/settings)
    dashboard.tsx           ← gated (/dashboard)
```

Adding a new gated page is a one-file change: drop it inside `(protected)/`. The folder name is wrapped in literal parentheses — generouted treats it as a route group that does NOT appear in the URL.

**`<AuthGate>` props:**
- `fallback` — UI shown to signed-out users (default: SDK's frosted-glass `<AuthOverlay/>`). Pass any React node — e.g., `fallback={<TeaserPage />}` for a custom signed-out UI.
- `redirectOnSignOut` — where the user lands when they sign out from inside the gate (default `'/'`). Triggers a full page reload so cached state can't leak into the signed-out view.

**Rules either way:**
- Use `useAuth().isSignedIn` for auth-state checks in components (session-based, updates immediately). `useUser()` loads async and causes a flash.
- `<AuthGate>` controls the **UI layer** — children don't mount until signed in. `RecordProvider allowAnonymous` controls the **data layer** — server accepts unsigned client connections. Inside an `<AuthGate>` subtree the user is always signed in, so `allowAnonymous` is moot there.
- Don't add a second sign-out — the avatar dropdown in `Navigation.tsx` already calls `signOut()`.
- **If the app requires sign-in, a sign-out control is non-negotiable.** Replace-with-care: any custom `Navigation.tsx` must still call `signOut()` from `deepspace` somewhere reachable when signed in.
- Don't rewrite `Navigation.tsx` just to theme it — edit tokens in `src/styles.css` (Step 5).
- See `docs/auth/gating-routes.md` in the SDK repo for the canonical reference.

### Step 5: Pick a Theme

Before building pages on an **initial build**, rewrite the `@theme` block in `src/styles.css` and update `<title>` / favicon in `index.html` so subsequent UI reflects the real brand instead of default dark-blue. If the user didn't specify a palette, pick one that fits the app's domain and tell them in one line. Load `references/uiux.md` §2 for the palette picker and token list (see **UI/UX Polish** below for the full trigger list). On maintenance work against an already-themed app, skip this step.

### Step 6: Build Pages and Features

Pages go in `src/pages/` — generouted scans this directory for file-based routing. Files outside `(protected)/` are public; files inside it require sign-in (see Step 4).

```
src/pages/home.tsx                    → /home          (public)
src/pages/items.tsx                   → /items         (public)
src/pages/(protected)/dashboard.tsx   → /dashboard     (gated)
src/pages/(protected)/settings.tsx    → /settings      (gated)
src/pages/_app.tsx                    → layout wrapper (providers + nav)
```

Features are reference implementations in `.deepspace/features/` (scaffolded into every app). To add one:

1. Read `.deepspace/features/<name>/feature.json` — a declarative manifest with:
   - `files[]`: each entry has `src` (path inside the feature folder) and `dest` (path in your app). Copy each file to its `dest`.
   - `schema`: if present, import the named export from its `importPath` and push it into the `schemas` array in `src/schemas.ts` (respect `spreadOperator: true` — those export arrays that need to be spread).
   - `route`: if present, add `{ path, label }` to `src/nav.ts` so the page appears in the top nav.
   - `requires`: feature IDs this one depends on — install them first.
   - `instructions`: any extra shell commands (e.g., `npm install yjs`).

2. Re-run `npx deepspace dev` if new DO classes or worker imports were added.

Replace the scaffold home page, wire mutations to `useToast`, and use scaffolded UI primitives from `src/components/ui/` — never browser defaults. See the **UI/UX Polish** section below for the full list of triggers to load `references/uiux.md` (initial builds, new UI patterns, or the app "feels generic"). For building a public-facing landing/marketing page, see **Landing Page Design** below and load `references/landing-design.md`.

Available features (check `.deepspace/features/` in the scaffolded app for the canonical list — names may evolve): `admin-page`, `ai-chat`, `canvas`, `cron`, `docs`, `file-manager`, `integration-test`, `items`, `kanban`, `landing`, `leaderboard`, `messaging`, `presence-test`, `sidebar`, `tasks`, `testing`, `topbar`, `tree`.

The `landing` feature scaffolds a page shell with pre-built sections (hero, features, testimonials, FAQ, CTA, footer). It is a **skeleton**, not a finished page — shipping its placeholder content reproduces the AI-generic look. Load `references/landing-design.md` to customize it, or to build a landing page from scratch for a different shape.

### Step 7: Run Locally

```bash
npx deepspace login   # one-time (or after `~/.deepspace/session` is wiped / expires) — opens browser
npx deepspace dev     # starts all workers + Vite with HMR on localhost:5173
```

**First run of `dev` requires login.** The CLI mints an app-specific `APP_OWNER_JWT` into `.dev.vars` using your identity, and exits immediately with `Not logged in. Run \`deepspace login\` first.` if there's no stored session. When you see that exact string:

1. **Pause and tell the user.** The command opens a browser tab (GitHub/Google OAuth) on their machine and polls for up to 10 minutes. They need to be at the keyboard to complete it — a blind background run can still time out if the user isn't ready.
2. **Run the login command without an artificial time bound.** Do not wrap it in `timeout N`, `sleep N && kill`, or any other cutoff — those terminate login before OAuth completes and leave no session file, looking like a bug when it's actually your own kill signal. (`timeout` isn't installed on macOS by default, so don't reach for it either.) If your harness supports running a long command in the background, use that; otherwise run it in the foreground and wait.
3. **Wait for `~/.deepspace/session` to exist** before retrying `npx deepspace dev`. Re-running `dev` while login is still polling produces the same error — that's not a bug, it's the expected order.
4. **Never copy `.dev.vars` from a sibling app.** Every `.dev.vars` contains an `APP_OWNER_JWT` minted against that app's wrangler name; borrowing one from a neighbor causes silent auth mismatches later. The only correct way to get `.dev.vars` is to let `npx deepspace dev` regenerate it after login succeeds.

The same login satisfies `npx deepspace test-accounts create` (Step 8) and `npx deepspace deploy` (Step 9); you only re-login if `~/.deepspace/session` is wiped or the session expires.

### Step 8: Test-Driven Verification (run when code changes)

Tests are the primary way to verify and debug code changes. The scaffolded tests (`smoke.spec.ts`, `api.spec.ts`, `collab.spec.ts`) are **starting points** — extend them for every code change that affects runtime behavior.

**When to run tests**: only after a code change (added/edited files in `src/`, `worker.ts`, or similar). Skip tests for conversation, planning, reading files, or answering questions — don't run them as a ritual.

**Workflow for any code change that touches runtime behavior:**

1. **Apply the extension checklist to what you changed.** Each rule is a hard requirement — if the condition is true, the test update is not optional:
   - **Added a schema?** → `smoke.spec.ts` CRUD happy path is **required** (create → read → edit → delete for a signed-in user).
   - **Added or edited a route, page, nav item, or top-level UI (landing, gallery, dashboard, settings)?** → `smoke.spec.ts` page-load with a **real-content** assertion is **required** (assert specific content that should be there, not just "no crash" — see route-coverage rule in `references/testing.md`). **For routes inside `src/pages/(protected)/`** (gated by `<AuthGate>`): also assert the two-state behavior — signed-out visitor sees `[data-testid="auth-overlay"]`, real content is NOT in the DOM; signed-in visitor sees real content, no overlay. **For public landing pages**: assert `[data-testid="auth-overlay"]` has count `0` to catch accidentally-protected routes. See `references/testing.md` § "Auth-state coverage" for the full table.
   - **Added a schema with `visibilityField`, or permissions containing `'public'`, `'shared'`, `'team'`, or `'own'`?** → `collab.spec.ts` two-user assertion is **required** (user A acts, user B sees the effect).
   - **Called `useYjs*`, `useMessages`, `useReactions`, `usePresence`, `useCanvas`, or any hook that syncs state across clients?** → `collab.spec.ts` two-user assertion is **required**.
   - **Added or edited a worker route in `worker.ts`, a server action, `/api/ai/chat`, a cron handler, any `integration.post(...)` call site, or any UI surface whose access depends on an HTTP-enforced auth/role check (e.g., an admin-only button calling `/api/actions/<name>`, even if the route itself wasn't edited)?** → `api.spec.ts` assertion is **required**. For integration calls, POST to `/api/integrations/<endpoint>` with the same body the app uses and assert the envelope comes back `success: true` with the shape your UI consumes — this locks the contract with the api-worker in the same session and catches wrong endpoint names, the #1 failure mode for integration-heavy apps. For routes/actions, assert status codes, response shape, and auth gating — including the negative path (unauthenticated or wrong-role caller gets 401/403) and other error cases (bad input, missing resources).
   - **Fixing a bug?** → write a failing test that reproduces it first, then fix the code until it passes. Leave the test in place.
2. **Run the relevant tests** (`npx playwright test <file>`). The scaffolded `tests/playwright.config.ts` has a `webServer` block that auto-starts Vite on port 5173 and reuses an existing one if present — you don't need to run `npx deepspace dev` in a separate shell just to run tests.
3. **Debug from failures, not from console logs.** If a test fails, read the assertion message, read the failing selector, then fix the code. Do not add `console.log` to diagnose — write a more specific assertion. Do not weaken or delete tests to make them green.
4. **Re-run after each follow-up change.** When the user asks for a tweak or new feature later, re-apply the checklist to the new change, update the tests, then run them. Treat tests as a living contract — but only exercise them when the contract actually changes.

Skipping tests after a code change is the #1 source of "I built it but it crashes on page load" handoffs. Skipping `collab.spec.ts` when rule 3 or 4 fires is the #1 source of "looks fine for me, broken for the second user" regressions.

For deeper surface — `tests/helpers/` API, `npx deepspace test-accounts` setup, record-cleanup convention, route-coverage rule, multi-user patterns, self-diagnosis — load `references/testing.md`. Trigger it on: writing or meaningfully extending a `*.spec.ts`; adding a new route, page, or CRUD feature (for the route-coverage rule — static and dynamic routes both need real-content assertions); `createTestUsers` erroring about missing accounts; or any failing, flaky, or passing-locally-failing-in-CI test you need to diagnose. Skip it for re-running existing tests, tiny selector/assertion tweaks inside a spec already extended this session, or code changes with no runtime behavior.

### Step 9: Deploy

On an **initial build**, load `references/uiux.md` §5 and run the pre-deploy checklist (home replaced, theme updated, no browser-default primitives, mutations fire toasts — see **UI/UX Polish** below for the canonical trigger list). On **follow-up deploys** where those were already verified, skip straight to the command below.

```bash
npx deepspace deploy  # deploys to <app-name>.app.space (re-run `npx deepspace login` if session has expired)
```

## Two Imports

```typescript
// Frontend (React)
import { RecordProvider, RecordScope, useQuery, useMutations, useAuth } from 'deepspace'

// Worker (Cloudflare Worker)
import { RecordRoom, verifyJwt, CHANNELS_SCHEMA } from 'deepspace/worker'
```

## Frontend Hooks

### Core
```typescript
const { records } = useQuery<Item>('items', { where: { status: 'published' }, orderBy: 'createdAt' })
const { create, put, remove } = useMutations<Item>('items')
// create returns Promise<string> (the new recordId) — capture it to navigate:
//   const id = await create({ title: 'New' }); navigate(`/items/${id}`)
// put/remove return Promise<void>. Use createConfirmed / putConfirmed / removeConfirmed
// when you must wait for server ack (read-after-write); the plain ones resolve after
// the optimistic local apply.
const { user } = useUser()          // storage-level: id, name, email, role
const { isSignedIn } = useAuth()    // auth state (use this as primary check)
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

### Other hooks and exports

The hooks shown above (Core, Messaging, Directory) are the data-and-identity primitives most apps use. For other SDK surfaces, read **`references/sdk-reference.md`** — it indexes every export grouped by domain, with usage snippets for the common non-obvious ones. Load it when building a feature that involves:

- **File uploads or image/video handling** → `useR2Files` (includes a local-dev caveat about `APP_IDENTITY_TOKEN` uploads)
- **Collaborative text editing** (docs, comments, notes) → `useYjsText` / `useYjsField`
- **Live cursors, typing indicators, "who's online"** → `usePresence`
- **Canvas / whiteboard features** → `useCanvas`
- **Video/audio rooms** → `useMediaRoom`
- **Theme customization** → `DeepSpaceThemeProvider`, `applyUIThemeTokens`
- **Environment-specific logic** → `isLocalDev()`, `getApiUrl()`
- **Any export not covered in this file** — `sdk-reference.md` is the canonical index.

For exact type signatures of any export, read `node_modules/deepspace/dist/index.d.ts` (frontend) or `node_modules/deepspace/dist/worker.d.ts` (worker). Do not guess hook names or argument shapes.

## Architecture

Each app has its own set of Durable Objects with schemas baked in at deploy time. The scaffold declares five DO classes in `__DO_MANIFEST__` and wires them in `worker.ts`: `AppRecordRoom`, `AppYjsRoom`, `AppCanvasRoom`, `AppMediaRoom`, `AppPresenceRoom`.

```
App Worker (per-app)                 Platform Worker (shared)
├── App{Record,Yjs,Canvas,…}Room    ├── Shared DOs for workspace / dir / conv
├── /ws/:roomId                     └── /api/health
├── /ws/yjs/:docId
├── /ws/canvas/:docId
├── /ws/media/:roomId
├── /ws/presence/:scopeId
├── /api/auth/* → auth-worker
├── /api/integrations/* → api-worker
└── Static assets (SPA fallback)
```

The scaffolded `AppRecordRoom` already passes your `schemas` to `RecordRoom` — you rarely need to touch `worker.ts`. The one case where you do is cross-app data sharing, below.

### Cross-app shared scopes

The scaffolded `/ws/:roomId` handler routes **every** scope to the app's own `RECORD_ROOMS` DO. That's fine for app-scoped data. If the app needs to read/write shared scopes (`workspace:*`, `dir:*`, `conv:*`) that must sync across DeepSpace apps (e.g., the email-handle workspace), two things need changing:

1. **Add the service binding to `wrangler.toml`** — the scaffold declares `PLATFORM_WORKER: Fetcher` in the TypeScript `Env` interface but does not ship the wrangler binding. Without it, `c.env.PLATFORM_WORKER` is `undefined` at runtime and the proxy silently falls through.

   ```toml
   [[services]]
   binding = "PLATFORM_WORKER"
   service = "deepspace-platform"   # name of the deployed platform worker
   ```

2. **Edit the `/ws/:roomId` handler** to proxy shared scopes to the platform worker:

   ```typescript
   // worker.ts — replace the single-line app.get('/ws/:roomId', wsRoute(...))
   app.get('/ws/:roomId', async (c) => {
     const roomId = c.req.param('roomId')
     if (c.env.PLATFORM_WORKER && /^(workspace|dir|conv):/.test(roomId)) {
       return c.env.PLATFORM_WORKER.fetch(c.req.raw)
     }
     return wsRoute((env) => env.RECORD_ROOMS)(c)
   })
   ```

Without both edits, `sharedScopes: [{ roomId: 'workspace:default', ... }]` on `<RecordScope>` writes to the app's own DO instead of the platform's shared DO, and cross-app data (e.g., other users' `@app.space` handles) won't appear.

## RBAC

Permissions are per-role, per-collection. Common values (cover 95% of apps):
- `true` / `false` — allow/deny all
- `'own'` — only records where `ownerField` matches userId (falls back to `record.createdBy` if `ownerField` is omitted)
- `'published'` — owner OR passes `visibilityField` check
- `'shared'` — owner OR collaborator OR published (uses `collaboratorsField` + `visibilityField`)
- `'team'` — owner OR collaborator OR team member

Advanced values (supported by `PermissionRule` but rarely needed — check `packages/deepspace/src/shared/types/index.ts` `PermissionRule` before using):
- `'unclaimed-or-own'` — record has no owner OR the caller owns it
- `'collaborator'` — caller is in `collaboratorsField`
- `'access'` — caller passes a per-collection access check

Built-in roles: `viewer | member | admin`. New authenticated users get `member` by default (override via `defaultRole` on the users schema). For unauthenticated connections use the `'*'` wildcard permission key — there is no built-in `anonymous` role.

### Data Visibility

When creating records scoped to specific users (e.g., conversations, private data):
- Set `Visibility: 'private'` — not `'public'`
- Populate `ParticipantIds` (or the relevant `collaboratorsField`) with all participant user IDs
- The SDK filters server-side in the DO — `canRead()` checks ownerField, collaboratorsField, and visibilityField before sending data over WebSocket
- Never rely on client-side filtering alone — data still syncs over WebSocket and is visible in dev tools

## Integrations

Call external APIs (OpenAI, weather, email, GitHub, Slack, Google, etc.) through the api-worker proxy:

```typescript
import { integration } from 'deepspace'
const result = await integration.post('openweathermap/geocoding', { q: city })
// Returns: { success: true, data: {...} } or { success: false, error: "..." }
```

**Do not guess endpoint names.** The format is `<integration-name>/<endpoint-name>` (two segments). Names like `geocode-city` or `weather-forecast` are not real — a wrong name will return a 404 at runtime.

**Auth-gate any UI that calls `integration.post(...)`.** Integrations default to owner-billed and the api-worker allows anonymous callers, so without a sign-in gate any visitor can spend the owner's credits. Wrap the calling page/button behind `useAuth().isSignedIn`. (For the app where end-users should pay for integration calls instead, see `references/integrations.md` § "Billing & access control" for the `billing: 'user'` flip.)

**Load `references/integrations.md` when the app needs to call any external API** — LLMs (OpenAI, Anthropic, Gemini), search (Exa, Firecrawl, SerpAPI), media (Freepik, ElevenLabs, CloudConvert), communication (Email, Slack, LiveKit), Google Workspace (Gmail, Drive, Calendar), social (GitHub, LinkedIn, YouTube, TikTok, Instagram), finance (Polymarket, stocks, crypto), sports, NASA, MTA, Wikipedia, and more. Verify the endpoint exists in that reference before calling it. Skip it for apps that only use client hooks.

## Server-Side Extensions

The scaffold ships three worker-side extension points in `worker.ts` beyond hooks and integrations: **server actions** (privileged writes that bypass the caller's RBAC), **AI chat** (streamed Claude/OpenAI/Cerebras with read-only tools over the app's records), and **cron** (scheduled background work). Load `references/server-extensions.md` when the user asks for any of those — it has the full usage for each, with code examples and rules. Skip it for apps that only need client hooks and `integration.post(...)`.

## UI/UX Polish

The scaffold's home page, theme, and UI primitive choices are placeholders — shipping them as-is produces a generic-looking app. This section is the canonical list of when to load `references/uiux.md`; the Step 5 and Step 9 pointers above reference back here.

**Load `references/uiux.md` when any of these apply:**
- **Initial build — theme (§2).** Before writing features, retheme the `@theme` block in `src/styles.css` and update `<title>` / favicon.
- **Initial build — home page and first pages.** Replace the scaffold home, pick UI primitives, wire mutations to `useToast`.
- **Initial build — pre-deploy checklist (§5).** Home replaced, theme updated, no browser-default primitives, mutations fire toasts.
- **Reaching for a UI pattern not yet built in this session** — confirmations, empty states, skeletons, dialogs, dropdowns, tooltips, etc. (§3 is the primitives table.)
- **About to write `<select>`, `window.confirm`, `window.alert`, or `window.prompt`** — stop and read §3 first; the scaffold ships a shadcn/ui primitive for every one of those.
- **The user says the app "feels generic"**, "boring", "default", "plain", or "needs polish".

Skip it for maintenance work against UI that already follows the primitives conventions and doesn't need a new pattern.

## Landing Page Design

Marketing pages are a separate surface from the authenticated app UI and a separate design problem. The `landing` feature ships a pre-built shell (typewriter hero, features grid, testimonials, FAQ, CTA, footer) — using it unmodified produces a generic AI-template look regardless of theme tweaks. Breaking out of that requires a Direction-first workflow, not more primitives.

**Load `references/landing-design.md` when:**
- The user asks for a landing page, marketing page, splash page, hero section, or "front page" for signed-out visitors.
- The user installs the `landing` feature and wants it customized to their product (the scaffolded content is not the finished page).
- The user says the landing page "feels generic", "looks AI-generated", "needs more personality", or names a specific marketing tone they want ("editorial", "dev-tool minimalism", "playful", etc.).
- You're about to generate atmospheric images for a hero or background — `landing-design.md` rule #9 has the required negative-prompt clause so the images don't come back with hallucinated text.

Skip it for the authenticated home page of a working app (that's `uiux.md` §1), small maintenance tweaks to an already-themed landing page, or apps without a marketing surface (signed-in-only productivity tools).

`references/landing-design.md` is the entry point — it has the 5-step workflow, 14 hard rules, and a short grep gate. It fans out to on-demand sub-references for the detailed material — load each one only when you reach the step that needs it:

- `landing-design/design-direction.md` — how to write the Direction brief.
- `landing-design/style-tile.md` — menus for the 6 Style Tile commits.
- `landing-design/inspiration-gallery.md` — pick ONE of 5 archetypes closest to your Direction.
- `landing-design/examples/0N-*.tsx` — five worked example landing pages (read-only; do not import from). Read exactly ONE — the one matching the archetype you picked.
- `landing-design/pattern-library.md` + `landing-design/pattern-library/{nav,hero,features,social-proof,cta,footer,scroll-motion}.md` — small index pointing at 7 section-specific snippet files. Load the index, then only the section files you need.
- `landing-design/anti-ai-checklist.md` — expanded hard rules + the full grep gate commands.

## Testing

Playwright-based. Step 8 above covers the in-build workflow (when to run, which file to extend, debug-from-failures rule). For anything beyond that, load `references/testing.md` — it covers:

- Full `tests/helpers/` API (`signInAs`, `createTestUsers`, `signOut`, error tracking) and `global-setup.ts`.
- `npx deepspace test-accounts` CLI + the `@deepspace.test` email convention, and the exact commands `createTestUsers` prints when accounts are missing.
- Test data cleanup convention (`__test-${Date.now()}__` prefix + per-test `created[]` + `afterEach` delete).
- Route-coverage rule: every reachable route — static or dynamic — needs a test that asserts real content, not just "no crash."
- Writing multi-user patterns with `createTestUsers(browser, N)`.
- Self-diagnosis workflow: write a failing test before adding `console.log`.

Skip it when Step 8's inline summary already covers the change you're making.

## Gotchas

These are concrete issues discovered in real dev sessions. Read before building.

- **Page files MUST go in `src/pages/`** — generouted only scans this directory. Putting pages in `src/features/<name>/` or elsewhere results in 404s even if nav links exist.
- **`useAuth().isSignedIn` for auth gating, not `useUser()`** — `isSignedIn` is session-based and updates immediately after sign-in. `useUser()` loads async and causes a flash of "not signed in" state.
- **Safari + localhost cookies** — `__Secure-` cookies require HTTPS. Safari enforces this; Chrome doesn't on localhost. Auth will appear broken on Safari in local dev. Works fine once deployed.
- **Integration response format** — api-worker returns `{ success: true, data: [...] }` where `data` may be a flat array. Don't look for `result.data.forecast` or `result.data.list` — check `Array.isArray(result.data)`.
- **Cross-app workspace isolation** — Each app worker has its own DO namespace, and the scaffolded `/ws/:roomId` handler routes everything to that local DO. `workspace:default` in app A is a different DO instance than `workspace:default` in app B until you add the `PLATFORM_WORKER` proxy edit shown in "Architecture → Cross-app shared scopes".
- **`createChannel()` defaults to `Visibility: 'public'`** — This means all users see all conversations. Override with `Visibility: 'private'` and set `ParticipantIds` for user-scoped data.
- **Schemas are columns only** — no `fields` property, no document-mode storage.
- **JWT provides user profile** — no separate `/api/users/me` call needed.
- **All tests use real services** — never mock internal hooks.
- **Port 5173 may be held by a parallel session** — Playwright's scaffolded config has `reuseExistingServer: true`, so a parallel session's Vite on 5173 will be picked up and your tests will run against **that** session's app, not yours. **Do not kill** the other session's process. If you need your own dev server, start it on a different port (`VITE_PORT=5174 npx deepspace dev`) **and** edit `tests/playwright.config.ts` so `webServer.port` and `use.baseURL` both point at 5174 (5175, 5176, …) before running tests.
- **Scaffold's local UI primitives shadow the SDK** — `_app.tsx` wraps the tree in `ToastProvider` from `src/components/ui/`, not from `deepspace`. Importing `useToast` (or any primitive the scaffold has locally) from `deepspace` throws `useToast must be used within ToastProvider` at runtime because the React contexts don't match. **Import UI primitives from `../components/ui`, not from `deepspace`**; check `_app.tsx` if unsure. Full explanation (React context module-instance identity) lives in `references/uiux.md` § "Critical import rule."

## Key Rules

- Schemas baked in at deploy time — no runtime schema loading
- Direct WebSocket per scope — no mux/gateway
- No user-scope DOs — user-scoped data lives in app DOs with RBAC filtering
- `pnpm dev` or `npx deepspace dev` for local dev — never run `wrangler dev` + `vite dev` separately
