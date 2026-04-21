---
name: deepspace
description: >
  Use when building real-time collaborative apps with the DeepSpace SDK on
  Cloudflare Workers, scaffolding a new DeepSpace app, or working in any
  project that imports from `deepspace` or `deepspace/worker`. Also use when
  the user mentions DeepSpace, app.space, RecordRoom, or asks to create a
  collaborative web app with real-time sync, auth, and deployment to
  Cloudflare Workers — even if they don't name DeepSpace explicitly.
---

# DeepSpace SDK

Build real-time collaborative apps on Cloudflare Workers. One npm package: SQLite-backed Durable Objects, RBAC, WebSocket subscriptions, Better Auth.

## Build a New App

### Step 1: Scaffold

```bash
# Published SDK (when available)
npx deepspace create <app-name>

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

The scaffolded `src/pages/_app.tsx` already ships the full provider stack. The shape is:

```tsx
// App() returns:
<ToastProvider>                           // from ../components/ui (local, NOT 'deepspace')
  <DeepSpaceAuthProvider>
    <AuthGate>                            // local component in _app.tsx; waits for useAuth().isLoaded
      <Navigation />                      // built-in Sign In + AuthOverlay + avatar dropdown + sign-out
      <Outlet />
    </AuthGate>
  </DeepSpaceAuthProvider>
</ToastProvider>

// AuthGate internally wraps its children:
<RecordProvider allowAnonymous>
  <RecordScope roomId={SCOPE_ID} schemas={schemas} appId={APP_NAME}>
    {children}
  </RecordScope>
</RecordProvider>
```

Do not rewrite `_app.tsx`. The defaults already:
- Wrap the tree in the scaffold's local `ToastProvider` (import `useToast` from `../components/ui`, not `deepspace`).
- Render routes for both signed-in and signed-out users — unauthenticated users just see routes that don't call authed hooks.
- Expose a Sign In button in `Navigation.tsx` that opens `<AuthOverlay onClose={...}/>` (GitHub + Google + email/password) and a sign-out option in the avatar dropdown.

Extend by adding schemas (Step 2), pages (Step 6), and nav entries (`src/nav.ts`). To share data across DeepSpace apps (e.g., the email-handle workspace), pass `sharedScopes` to the existing `<RecordScope>` — but see "Cross-app shared scopes" under Architecture below, because the scaffolded worker needs a small edit for that to actually hit the platform worker's DO.

### Step 4: Auth — When to Leave the Scaffold Alone vs. Gate the App

The scaffold's Sign-In-button-in-nav pattern is the right default for any app with public content (landing, public posts, published items). Leave it alone.

**Only override** when the app must be fully signed-in-only (personal task board, team-only board). In that case, render `AuthOverlay` non-dismissable and gate the real UI in the page that would otherwise show:

```tsx
import { useAuth, AuthOverlay } from 'deepspace'

export default function HomePage() {
  const { isSignedIn, isLoaded } = useAuth()
  if (!isLoaded) return <LoadingSpinner />
  if (!isSignedIn) return <AuthOverlay />    // no onClose → user can't dismiss
  return <Dashboard />
}
```

Rules either way:
- Use `useAuth().isSignedIn` for auth gating (session-based, updates immediately). `useUser()` loads async and causes a flash.
- `<AuthOverlay/>` auto-hides when signed in (returns `null`), so dropping `onClose` is safe when you also gate with `!isSignedIn`.
- Don't add a second sign-out — the avatar dropdown in `Navigation.tsx` already calls `signOut()`.
- Don't rewrite `Navigation.tsx` just to theme it — edit tokens in `src/styles.css` (Step 5).

### Step 5: Pick a Theme

Before building pages on an **initial build**, rewrite the `@theme` block in `src/styles.css` and update `<title>` / favicon in `index.html` so subsequent UI reflects the real brand instead of default dark-blue. If the user didn't specify a palette, pick one that fits the app's domain and tell them in one line. On initial builds, load `references/uiux.md` §2 for the palette picker and token list. On maintenance work against an already-themed app, skip this step.

### Step 6: Build Pages and Features

Pages go in `src/pages/` — generouted scans this directory for file-based routing.

```
src/pages/home.tsx    → /home
src/pages/items.tsx   → /items
src/pages/_app.tsx    → layout wrapper (providers + nav)
```

Features are reference implementations in `.deepspace/features/` (scaffolded into every app). To add one:

1. Read `.deepspace/features/<name>/feature.json` — a declarative manifest with:
   - `files[]`: each entry has `src` (path inside the feature folder) and `dest` (path in your app). Copy each file to its `dest`.
   - `schema`: if present, import the named export from its `importPath` and push it into the `schemas` array in `src/schemas.ts` (respect `spreadOperator: true` — those export arrays that need to be spread).
   - `route`: if present, add `{ path, label }` to `src/nav.ts` so the page appears in the top nav.
   - `requires`: feature IDs this one depends on — install them first.
   - `instructions`: any extra shell commands (e.g., `npm install yjs`).

2. Re-run `npx deepspace dev` if new DO classes or worker imports were added.

Replace the scaffold home page, wire mutations to `useToast`, and use scaffolded UI primitives from `src/components/ui/` — never browser defaults. Load `references/uiux.md` on initial builds, when adding UI you haven't built in this session yet (confirmations, empty states, skeletons), or when the user says the app "feels generic". Skip it for small tweaks against UI that already exists and already uses the primitives.

Available features (check `.deepspace/features/` in the scaffolded app for the canonical list — names may evolve): `admin-page`, `ai-chat`, `canvas`, `cron`, `docs`, `file-manager`, `integration-test`, `items`, `kanban`, `landing`, `leaderboard`, `messaging`, `presence-test`, `sidebar`, `tasks`, `testing`, `topbar`, `tree`.

### Step 7: Run Locally

```bash
npx deepspace dev     # starts all workers + Vite with HMR on localhost:5173
```

### Step 8: Test-Driven Verification (run when code changes)

Tests are the primary way to verify and debug code changes. The scaffolded tests (`smoke.spec.ts`, `api.spec.ts`, `collab.spec.ts`) are **starting points** — extend them for every code change that affects runtime behavior.

**When to run tests**: only after a code change (added/edited files in `src/`, `worker.ts`, or similar). Skip tests for conversation, planning, reading files, or answering questions — don't run them as a ritual.

**Workflow for any code change that touches runtime behavior:**

1. **Customize or extend the relevant test file** to cover what you just built or modified:
   - **smoke.spec.ts** — update when adding a new page, route, nav item, or top-level UI (landing, gallery, dashboard, settings). Assert the page loads, expected content is visible, no console/page errors.
   - **api.spec.ts** — update when adding worker routes, integration calls, or endpoints that require auth. Assert status codes, response shape, auth gating, error cases.
   - **collab.spec.ts** — update when adding multi-user flows (shared records, messaging, permissions, presence, invites, real-time sync). Use `createTestUsers(browser, N)` and assert one user's action is visible/effective for another.
2. **Run the relevant tests** (`npx playwright test <file>`). The scaffolded `tests/playwright.config.ts` has a `webServer` block that auto-starts Vite on port 5173 and reuses an existing one if present — you don't need to run `npx deepspace dev` in a separate shell just to run tests.
3. **Debug from failures, not from console logs.** If a test fails, read the assertion message, read the failing selector, then fix the code. Do not add `console.log` to diagnose — write a more specific assertion. Do not weaken or delete tests to make them green.
4. **Re-run after each follow-up change.** When the user asks for a tweak or new feature later, update the tests alongside the code change, then run them. Treat tests as a living contract — but only exercise them when the contract actually changes.

**When to reach for which test:**
- Single-user UI / CRUD / navigation → extend `smoke.spec.ts`.
- Worker route, integration call, RBAC on HTTP → extend `api.spec.ts`.
- Anything where user A's action should affect user B's view → extend `collab.spec.ts`.
- A bug you're trying to fix → write a failing test that reproduces it first, then fix the code.

Skipping tests after a code change is the #1 source of "I built it but it crashes on page load" handoffs.

### Step 9: Deploy

On an **initial build**, load `references/uiux.md` §5 and run the pre-deploy checklist (home replaced, theme updated, no browser-default primitives, mutations fire toasts). On **follow-up deploys** where those were already verified, skip straight to the commands below.

```bash
npx deepspace login  # opens browser — the ONE human step in the whole flow
npx deepspace deploy  # deploys to <app-name>.app.space
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

**Load `references/integrations.md` when the app needs to call any external API** — LLMs (OpenAI, Anthropic, Gemini), search (Exa, Firecrawl, SerpAPI), media (Freepik, ElevenLabs, CloudConvert), communication (Email, Slack, LiveKit), Google Workspace (Gmail, Drive, Calendar), social (GitHub, LinkedIn, YouTube, TikTok, Instagram), finance (Polymarket, stocks, crypto), sports, NASA, MTA, Wikipedia, and more. Verify the endpoint exists in that reference before calling it. Skip it for apps that only use client hooks.

## Server-Side Extensions

The scaffold ships three worker-side extension points in `worker.ts` beyond hooks and integrations: **server actions** (privileged writes that bypass the caller's RBAC), **AI chat** (streamed Claude/OpenAI/Cerebras with read-only tools over the app's records), and **cron** (scheduled background work). Load `references/server-extensions.md` when the user asks for any of those — it has the full usage for each, with code examples and rules. Skip it for apps that only need client hooks and `integration.post(...)`.

## UI/UX Polish

The scaffold's home page, theme, and UI primitive choices are placeholders — shipping them as-is produces a generic-looking app. Load `references/uiux.md` **on initial builds** (home + theme + first pages) and **whenever reaching for a UI pattern not yet built in this session** (confirmations, empty states, skeletons, etc.) or when the user says the app "feels generic". Skip it for maintenance work against UI that already follows the primitives conventions.

## Testing

Every scaffolded app includes Playwright tests in `tests/` with helpers for auth, error tracking, and multi-user flows. Use these tests to verify your work — don't rely on manual testing or console logs to debug issues.

### Running Tests

```bash
npx playwright test              # run all tests
npx playwright test smoke.spec   # run a specific test file
```

No separate dev server required — the scaffolded `tests/playwright.config.ts` has a `webServer` block that starts Vite on port 5173 and reuses an existing one if present (`reuseExistingServer: true`).

### Scaffolded Test Files

- `smoke.spec.ts` — app loads, navigation renders, sign-in button present, page title correct
- `api.spec.ts` — API endpoints return expected responses, auth required where expected
- `collab.spec.ts` — multi-user: two users connect, see each other, data syncs between them
- `tests/feature-tests/tests/<feature-id>.spec.ts` — per-feature merge-gate specs (e.g., `docs.spec.ts` for the docs feature). Auto-discovered and run by the e2e harness when the feature is installed. When you add a custom feature, drop a `<feature-id>.spec.ts` alongside the others with multi-user assertions.

### Test Helpers (`tests/helpers/`)

- `auth.ts` — `signInAs(page, email, password)`, `createTestUsers(browser, N)`, `loadLocalAccounts()`, and `signOut(page)`. All read credentials from `~/.deepspace/test-accounts.json` (written by the `deepspace test-accounts` CLI). There is **no `signUp` helper** — public sign-up is intentionally disabled server-side. If the local file is missing accounts, `createTestUsers` throws an error that prints the exact commands to create them.
- `global-setup.ts` — warms up the auth worker before tests run.
- `errors.ts` — captures console errors and page errors during tests.

### Authenticated tests — use `npx deepspace test-accounts`

Public signup is intentionally disabled. Tests sign in (not sign up) using credentials created via the `deepspace test-accounts` CLI — the scaffold's `tests/helpers/auth.ts` already wires this up.

**If `createTestUsers` throws** saying there aren't enough local accounts, the error message prints exact copy-paste commands with a `Date.now()` millisecond timestamp that keeps them globally unique across developers and machines (the auth worker enforces email uniqueness at the user-table level):

```bash
npx deepspace login   # if not already
npx deepspace test-accounts create --email test-1-1776798210521@deepspace.test --password Pass123! --name "Test User 1"
npx deepspace test-accounts create --email test-2-1776798210521@deepspace.test --password Pass123! --name "Test User 2"
```

Credentials persist at `~/.deepspace/test-accounts.json` (mode 0600). Emails must end `@deepspace.test`. Max 10 per developer. Run as part of the same session — don't silently skip collab tests or punt with "requires manual QA." Run `npx deepspace test-accounts --help` for the full CLI.

### Writing New Tests

**Single-user flows** (CRUD, navigation, UI state): import `signInAs` and `loadLocalAccounts` from `./helpers/auth` and sign one page in.

**Multi-user flows** (real-time sync, sharing, permissions): use the scaffold's `createTestUsers(browser, N)` helper — it opens N isolated browser contexts, signs each into a distinct local test account, and returns `{ context, page, email, name }[]`.

```typescript
import { createTestUsers } from './helpers/auth'

test('user A's action appears for user B', async ({ browser }) => {
  const [userA, userB] = await createTestUsers(browser, 2)
  try {
    await userA.page.getByTestId('create-btn').click()
    await userA.page.getByTestId('title-input').fill('My Item')
    await userA.page.getByTestId('save-btn').click()
    await expect(userB.page.getByText('My Item')).toBeVisible()
  } finally {
    await userA.context.close()
    await userB.context.close()
  }
})
```

### Test data cleanup — tests must not pollute the dev DB

Tests run against the same local Durable Object the dev server uses, so any records a test creates will still be visible in `npx deepspace dev` afterwards. That's a problem once the app has real data.

**Convention every test must follow:**

1. **Prefix every record you create with `__test-${Date.now()}__`** in its human-visible field (title, name, question, etc.) so test data is always recognizable.
2. **Clean up in `afterEach` / `afterAll`**: iterate the mutations you made in the test and delete the records you created. Keep a list of created `recordId`s inside the test, then remove them.

```typescript
test('user A posts a message user B sees', async ({ browser }) => {
  const [userA, userB] = await createTestUsers(browser, 2)
  const created: string[] = []
  try {
    const title = `__test-${Date.now()}__ Hello`
    // ... create, grab the resulting recordId, push to `created` ...
    // ... assertions ...
  } finally {
    // Delete in reverse order, best-effort
    for (const id of created.reverse()) {
      try { await userA.page.evaluate(
        async (recordId) => {
          /* call your delete endpoint or mutate hook */
        }, id,
      ) } catch { /* swallow */ }
    }
    await userA.context.close()
    await userB.context.close()
  }
})
```

**Do not** add a blanket "wipe the DB between tests" step — that would destroy real data the developer is working with. The cleanup must be scoped to records the test itself created. If you see a test using `DELETE FROM` or dropping collections, replace it.

### Route coverage — every route must be tested

A smoke test that only loads `/` (or the home page) is not enough. If a route is reachable in the app — for example, static (`/polls`) or dynamic (`/polls/:id`) — there must be a test that:

1. Navigates to it (for dynamic routes: create a record first, grab its id, navigate).
2. Waits for the page's real content to appear (not just "no crash" — assert a specific element with real data, e.g., `expect(page.getByTestId('poll-question')).toContainText(questionText)`).
3. Fails loudly if the page renders an empty/not-found state when it shouldn't.

Passing a smoke test where the detail page silently shows "Poll not found" is the failure mode that shipped the group-poll regression. A "page loads without JS errors" assertion is insufficient — assert that the data that should be there **is** there.

### Proactive Test Authoring

Write and update tests **as you build**, not after. Every new page, feature, or user-visible change should trigger a corresponding test update in the same session — before saying "done":

- **New page / route / nav item** → extend `smoke.spec.ts`. Add a test that navigates to the page, asserts the expected headline/components are visible, and the page has no errors.
- **New CRUD feature** (items, posts, whatever) → extend `smoke.spec.ts` with a create/read/edit/delete happy path for a signed-in user.
- **New worker route or integration call** → extend `api.spec.ts`. Assert success responses, auth-required failures, and error shapes.
- **New multi-user behavior** (sharing, invites, messages, presence, permissions, shared scopes) → extend `collab.spec.ts`. Create two users, act in one, assert in the other.
- **RBAC changes or permission tweaks** → add tests in `collab.spec.ts` with users of different roles, asserting what each can and cannot see/do.
- **Bug fix** → write the failing test first (reproducing the bug), then fix the code until it passes. Leave the test in the suite.

When the user asks for a change in a follow-up message, update the tests in the same turn — don't let them drift. The test suite is a living contract.

### Self-Diagnosis with Tests

When something isn't working, do **not** start with console logs. Start with:
1. Write (or tighten) a test that expresses the expected behavior.
2. Run it. Read the failure message and the failing selector/assertion.
3. Fix the code until the test passes.
4. Leave the test in place — it now guards against regression.

Console logs are a last resort, not a first step. A failing test tells you more than a log ever will: what was expected, what was observed, where in the flow it diverged. If a test is flaky or passes locally but fails in CI, investigate the flake — do not mark it `.skip` or delete it.

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
- **Scaffold has local UI primitives that shadow SDK names** — `src/components/ui/Toast.tsx` exports its own `ToastProvider` + `useToast`, and the scaffolded `_app.tsx` wraps the app in the **local** `ToastProvider`. If you import `useToast` from `deepspace`, you'll hit `useToast must be used within ToastProvider` at runtime because the contexts don't match. **Import UI primitives from `../components/ui` (or the equivalent local path), not from `deepspace`**, unless you've verified the scaffold uses the SDK version. The same shadowing can apply to other UI components — always check the scaffolded `_app.tsx` to see which provider is in the tree before picking an import source.

## Key Rules

- Schemas baked in at deploy time — no runtime schema loading
- Direct WebSocket per scope — no mux/gateway
- No user-scope DOs — user-scoped data lives in app DOs with RBAC filtering
- `pnpm dev` or `npx deepspace dev` for local dev — never run `wrangler dev` + `vite dev` separately
