# Testing

Load this reference when writing or updating a Playwright test, when the `users` fixture errors with missing accounts, when a test fails and you need to decide how to diagnose, or when extending `smoke.spec.ts` / `api.spec.ts` / `collab.spec.ts` / per-feature specs. Skip it for conversation, planning, code-reading, or code changes whose runtime behavior is already covered by an existing test.

This file is canonical for the test extension checklist (the Step 8 rules below), the helpers, auth setup, cleanup conventions, route coverage, multi-user patterns, and self-diagnosis. `SKILL.md` links here.

Every scaffolded app includes Playwright tests in `tests/` with helpers for auth, error tracking, and multi-user flows. Use these tests to verify your work — don't rely on manual testing or console logs to debug issues.

## Step 8 extension checklist

**Run tests only after a runtime-affecting code change** (`src/`, `worker.ts`, etc.). Skip them for conversation, planning, reading, or pure documentation edits — don't run as a ritual.

**Each row is a hard requirement:**

| Trigger | Required test |
|---|---|
| Added a schema | `smoke.spec.ts` — CRUD happy path (create → read → edit → delete for a signed-in user) |
| Added/edited a route, page, nav item, or top-level UI (landing, gallery, dashboard, settings) | `smoke.spec.ts` — page-load with **real-content** assertion (not just "no crash"). For `(protected)/` routes: also assert two-state (signed-out → `[data-testid="auth-overlay"]` visible **and** content not in DOM; signed-in → content visible, no overlay). For public routes: `[data-testid="auth-overlay"]` count is `0`. |
| Schema with `visibilityField` or `'public'`/`'shared'`/`'team'`/`'own'` permissions | `collab.spec.ts` — two-user assertion (A acts, B sees) |
| Used `useYjs*` / `useMessages` / `useReactions` / `usePresence` / `useCanvas` | `collab.spec.ts` — two-user assertion |
| Added/edited worker route, server action, `/api/ai/chat`, cron handler, `integration.post(...)`, or auth-gated UI calling `/api/actions/<name>` | `api.spec.ts` — status codes + response shape + auth gating (incl. 401/403 negative path). For integrations: POST and assert `success: true` with the shape the UI consumes — locks the contract, catches wrong endpoint names. |
| Fixing a bug | Write a failing test that reproduces it **first**, then fix until it passes. Leave the test in place. |

**Workflow rules:**

- **All tests use real services** — never mock internal hooks.
- **Debug from failures, not console logs.** Read the assertion + selector, fix the code. Don't add `console.log` to diagnose — write a more specific assertion. Don't weaken or delete tests to make them green.
- **Re-run after each follow-up change.** Re-apply the checklist; tests are a living contract.

Skipping the checklist when its conditions fire is the most common cause of "I built it but it crashes on page load" handoffs and "looks fine for me, broken for the second user" regressions.

## Running Tests

Two paths — pick based on what you're doing:

```bash
# Official entry point. Auto-installs Playwright + chromium on first run, writes
# .dev.vars against dev workers, forwards $DEEPSPACE_PORT to the Playwright child.
npx deepspace test                    # default = smoke + api
npx deepspace test smoke              # smoke only
npx deepspace test api                # api only
npx deepspace test e2e                # all Playwright specs
npx deepspace test unit               # vitest unit tests
npx deepspace test all                # vitest + Playwright
npx deepspace test tests/foo.spec.ts  # one file
npx deepspace test --port 5180        # match a parallel `deepspace dev --port 5180`

# Plain Playwright. Works once chromium is installed; no .dev.vars regeneration,
# no APP_OWNER_JWT mint. Use it to iterate on a single spec or run with custom flags.
npx playwright test                   # all specs
npx playwright test smoke.spec        # one file
npx playwright test --ui              # Playwright's interactive UI
```

No separate dev server required either way — the scaffolded `tests/playwright.config.ts` has a `webServer` block that starts Vite on port 5173 and reuses an existing one if present (`reuseExistingServer: true`).

### Screenshots (for visual debugging)

`npx deepspace screenshot <url> <output>` takes a Playwright Chromium screenshot of any URL. Shares the same Playwright + chromium install as `npx deepspace test` — installs on first use if missing. Useful for "render the home page and show me what it looks like" workflows, and for capturing failure states without writing a one-off spec.

```bash
npx deepspace screenshot http://localhost:5173/ out.png
npx deepspace screenshot http://localhost:5173/dashboard out.png --full-page
npx deepspace screenshot http://localhost:5173/ out.png --wait-for-timeout 500
```

This is a visual-inspection helper, not a substitute for Playwright assertions. Don't add it to the test checklist; do reach for it when an agent wants to confirm "what does this page actually render right now."

## Scaffolded Test Files

- `smoke.spec.ts` — app loads, navigation renders, sign-in button present, page title correct
- `api.spec.ts` — API endpoints return expected responses, auth required where expected
- `collab.spec.ts` — multi-user: two users connect, see each other, data syncs between them

These three files are where every test lives. Installing a feature (e.g., `docs`, `kanban`, `messaging`) does not add a new spec file — extend these three per the Step 8 checklist in `SKILL.md`.

## Two layers of helpers

The SDK ships two layers — pick based on the test you're writing:

### `deepspace/testing` — the published Playwright fixture (for any signed-in test)

The SDK publishes a `users` fixture and account helpers from `'deepspace/testing'` — built on top of cached `storageState` so each test account signs in **once** per machine, not once per test. This sidesteps Better Auth's per-IP rate limit on `/api/auth/sign-in/email` and is materially faster as a suite grows.

```typescript
import { test, expect } from 'deepspace/testing'

test('A sends, B sees', async ({ users }) => {
  const [a, b] = await users(2)              // first 2 accounts from ~/.deepspace/test-accounts.json
  await a.page.goto('/chat')
  await b.page.goto('/chat')
  await a.page.getByTestId('send-btn').click()
  await expect(b.page.getByText('hi')).toBeVisible()
})

// Or pick specific accounts by name:
test('alice and bob', async ({ users }) => {
  const [alice, bob] = await users(['Alice', 'Bob'])
  // ...
})
```

`MultiplayerUser` returned from `users(...)` is `{ context, page, email, name, userId? }`. Contexts are auto-closed when the test finishes — no `try/finally` needed for cleanup of contexts (you still clean up *records* you create — see "Test data cleanup" below).

**Requires `baseURL`** in `tests/playwright.config.ts` (the scaffold sets it; check if your suite errors with `users fixture requires a baseURL`).

**Escape hatches** — when the fixture isn't enough, import directly:
- `loadAllTestAccounts()` — return every cached account.
- `pickTestAccounts(n, options?)` — first N accounts; pass `{ label }` to filter.
- `findTestAccountByName(name)` — lookup by display name.
- `ensureStorageState(browser, account, baseURL)` — sign in once, return the storageState path. Reuse via `browser.newContext({ storageState: path })`.
- `newSignedInContext(email, browser)` — one-liner for a signed-in BrowserContext.
- `getStatePathForEmail(email)` / `readCachedState(path)` — direct cache access.

Types: `MultiplayerUser`, `UsersFixture`, `TestAccount`, `EnsureStorageStateOptions`.

### `tests/helpers/` (local — scaffolded utilities)

The scaffolded `tests/helpers/` directory ships exactly two files (no auth helper — sign-in goes through the SDK fixture above):

- `errors.ts` — exports `captureConsoleErrors(page)` to capture console errors and page errors during tests. Used by `smoke.spec.ts`.
- `global-setup.ts` — Playwright `globalSetup` hook that warms up the deployed auth-worker before tests run (cold-start latency can fail the first test otherwise).

For a single-user signed-in test, use `newSignedInContext` from the escape hatches below, or write the spec with `@playwright/test` directly if it doesn't need auth at all (the scaffolded `smoke.spec.ts` is an example).

## Authenticated tests — reuse the existing pool first

Public signup is intentionally disabled. Tests sign in (not sign up) using credentials in `~/.deepspace/test-accounts.json` — populated via the `deepspace test-accounts` CLI and consumed automatically by the `users(N)` fixture from `'deepspace/testing'`.

**The pool is global per developer with a hard cap of 10 accounts.** It is **not** scoped to one app. Apps share it. Treat the pool as a fixed resource — burning slots for "themed" accounts (`team-kanban-a@`, `pair-doc-alice@`, …) hits the cap within a few sessions and benefits nothing, since the apps don't care which test identity they get.

**Before writing any spec that needs N signed-in users, in this order:**

1. **Check what's there.** Run `npx deepspace test-accounts list` and count. If ≥ N, **stop here** — use them.
2. **Use the fixture, not hardcoded emails.** `const [a, b] = await users(2)` picks the first N existing accounts; `await users(['Alice', 'Bob'])` picks specific ones by name. Either way, no creation happens. `pickTestAccounts(N)` does the same outside a fixture context.
3. **Only create new accounts if `list` shows fewer than N**, and only as many as you actually need to reach N. Use the timestamped emails the SDK suggests (uniqueness is enforced at the auth-worker user table) — never bake the app name into the email.

**The scaffolded `collab.spec.ts` ships with `await users(['Collab A', 'Collab B'])`.** If those names aren't in your local pool, the call throws `No test account named "Collab A"…` and the SDK's error message helpfully suggests `Create with: deepspace test-accounts create …`. **Don't follow that suggestion when your pool already has ≥ N accounts — it's the wrong fork.** The right fix is a one-token edit: change the call to `await users(2)`, which picks the first N accounts in the pool by `createdAt` regardless of name. Reserve the named form (`users(['Alice', 'Bob'])`) for tests that genuinely need specific identities — e.g., a feature whose behavior differs by user name or a fixture you're hand-curating across runs.

```bash
# Only when the pool is genuinely below N:
npx deepspace login   # if not already
npx deepspace test-accounts create --email test-1-1776798210521@deepspace.test --password Pass123! --name "Test User 1"
npx deepspace test-accounts create --email test-2-1776798210521@deepspace.test --password Pass123! --name "Test User 2"
```

Credentials persist at `~/.deepspace/test-accounts.json` (mode 0600). Emails must end `@deepspace.test`. Run any creation in the same session — don't silently skip collab tests or punt with "requires manual QA." Run `npx deepspace test-accounts --help` for the full CLI (includes `delete --email`, `clear`, `clear --label e2e`, `clear --yes` for cleanup).

## Writing New Tests

**Single-user flows** (CRUD, navigation, UI state): use the `users` fixture and destructure one entry — `const [user] = await users(1)` — or call `newSignedInContext(email, browser)` directly if you want a single signed-in `BrowserContext` outside the fixture. If the test doesn't need auth, just `import { test, expect } from '@playwright/test'` like the scaffolded `smoke.spec.ts` does.

**Multi-user flows** (real-time sync, sharing, permissions): use the published fixture from `'deepspace/testing'`. It opens N isolated browser contexts with cached `storageState`, returns `{ context, page, email, name, userId? }[]`, and auto-closes contexts when the test finishes.

```typescript
import { test, expect } from 'deepspace/testing'

test("user A's action appears for user B", async ({ users }) => {
  const [userA, userB] = await users(2)
  await userA.page.getByTestId('create-btn').click()
  await userA.page.getByTestId('title-input').fill('My Item')
  await userA.page.getByTestId('save-btn').click()
  await expect(userB.page.getByText('My Item')).toBeVisible()
})
```


## Test data cleanup — tests must not pollute the dev DB

Tests run against the same local Durable Object the dev server uses, so any records a test creates will still be visible in `npx deepspace dev` afterwards. That's a problem once the app has real data.

**Convention every test must follow:**

1. **Prefix every record you create with `__test-${Date.now()}__`** in its human-visible field (title, name, question, etc.) so test data is always recognizable.
2. **Clean up in `afterEach` / `afterAll`**: iterate the mutations you made in the test and delete the records you created. Keep a list of created `recordId`s inside the test, then remove them.

```typescript
import { test, expect } from 'deepspace/testing'

test('user A posts a message user B sees', async ({ users }) => {
  const [userA, userB] = await users(2)
  const created: string[] = []
  try {
    const title = `__test-${Date.now()}__ Hello`
    // ... create, grab the resulting recordId, push to `created` ...
    // ... assertions ...
  } finally {
    // Delete in reverse order, best-effort. Contexts auto-close — no need to
    // close them here; only records you created need explicit cleanup.
    for (const id of created.reverse()) {
      try { await userA.page.evaluate(
        async (recordId) => {
          /* call your delete endpoint or mutate hook */
        }, id,
      ) } catch { /* swallow */ }
    }
  }
})
```

**Do not** add a blanket "wipe the DB between tests" step — that would destroy real data the developer is working with. The cleanup must be scoped to records the test itself created. If you see a test using `DELETE FROM` or dropping collections, replace it.

## Route coverage — every route must be tested

A smoke test that only loads `/` (or the home page) is not enough. If a route is reachable in the app — for example, static (`/polls`) or dynamic (`/polls/:id`) — there must be a test that:

1. Navigates to it (for dynamic routes: create a record first, grab its id, navigate).
2. Waits for the page's real content to appear (not just "no crash" — assert a specific element with real data, e.g., `expect(page.getByTestId('poll-question')).toContainText(questionText)`).
3. Fails loudly if the page renders an empty/not-found state when it shouldn't.

Passing a smoke test where the detail page silently shows "Poll not found" is the failure mode that shipped the group-poll regression. A "page loads without JS errors" assertion is insufficient — assert that the data that should be there **is** there.

## Auth-state coverage — public vs gated routes

The scaffold ships the **mixed** auth config (public landing + gated app via `(protected)/_layout.tsx`). Every route falls in one of three buckets — each needs a different smoke assertion:

| Route lives at | Smoke assertion |
|---|---|
| `src/pages/<name>.tsx` (public) | `signed-out` visitor sees real content + `[data-testid="auth-overlay"]` has count `0`. If overlay leaks, the route is accidentally gated. |
| `src/pages/(protected)/<name>.tsx` (gated) | `signed-out` visitor sees `[data-testid="auth-overlay"]` visible **and** the page's real content is **not** in the DOM. `signed-in` visitor sees real content + zero overlays. |
| Any route after a sign-out from inside `(protected)/` | After clicking Sign out, URL navigates to `redirectOnSignOut` (default `'/'`, which usually redirects on to `/home`). Assert the URL change happened AND the overlay didn't appear. The full-page `window.location.replace` is the SDK's safe-redirect; testing it catches the regression where users got stranded staring at the overlay. |

The `[data-testid="auth-overlay"]` attribute is on the SDK's `<AuthOverlay/>` — both the AuthGate's default fallback and the standalone usage. Querying for it is more reliable than text matching ("Sign in" appears in many places).

If you customize a `<AuthGate fallback={<TeaserPage/>}/>` to use a non-default fallback, swap the assertion to a stable selector inside your teaser instead.

## Collaborative-editor surfaces (ProseMirror / `contenteditable`)

Tiptap / ProseMirror editors backed by `useYjsRoom` need two pattern adjustments compared to plain inputs:

- **Don't use `getByRole('textbox')`** — a page that renders a title `<input>` *and* a ProseMirror surface has multiple textbox-role nodes and the locator is ambiguous. Target the editable surface directly: `page.locator('[data-testid="editor-content"] .ProseMirror')` (or whatever stable `data-testid` you wrap `<EditorContent>` in).
- **Don't use `expect(locator).toBeEditable()`** — Playwright's actionability poll runs busy enough to starve the WebSocket `onmessage` callback, so the YjsRoom AUTH frame (`{ type: 'auth', canWrite: true }`) never gets processed and `contenteditable` stays `"false"`. Switch to a passive attribute poll:

```typescript
const editor = page.locator('[data-testid="editor-content"] .ProseMirror')
// Writer (member/owner) — wait for canWrite to flip true:
await expect.poll(
  () => editor.getAttribute('contenteditable'),
  { timeout: 30_000, intervals: [500] },
).toBe('true')

// Viewer — assert it stays read-only:
await expect.poll(
  () => editor.getAttribute('contenteditable'),
  { timeout: 30_000, intervals: [500] },
).toBe('false')
```

Same race applies to any `useYjsRoom` / `useCanvas` / `useGameRoom` / `useCronMonitor` UI gated by `canWrite` — if the test wants to assert a writer can act before clicking, poll the gate's DOM signal (a disabled-state attribute, `aria-readonly`, or `contenteditable`) instead of relying on actionability checks.

## Proactive Test Authoring

Write and update tests **as you build**, not after. The Step 8 checklist in `SKILL.md` is the canonical trigger list — each rule names a condition on the code and a required test file. Don't duplicate those rules here; instead, treat this section as the worked-example elaboration:

- **New page / route / nav item** → `smoke.spec.ts`. Navigate to the page, assert the expected headline/components are visible, page has no errors. Dynamic routes (`/polls/:id`) need real-content assertions against a created record — see "Route coverage" below.
- **New CRUD feature** (items, posts, whatever — anything backed by a new schema) → `smoke.spec.ts` with a create → read → edit → delete happy path for a signed-in user.
- **New worker route, server action, AI chat route, cron handler, any `integration.post(...)` call, or any UI that relies on an HTTP-enforced auth/role check (e.g., an admin-only action button calling `/api/actions/<name>`, even when the route itself is pre-existing)** → `api.spec.ts`. For integration calls, POST to `/api/integrations/<endpoint>` and assert the envelope is `success: true` with the data the UI consumes — this catches wrong endpoint names, the most common integration-heavy-app failure. For routes/actions/AI/cron, assert status codes, response shape, and auth gating — including the negative path (unauthenticated or wrong-role caller gets 401/403) and other error cases (bad input, missing resources).
- **New multi-user behavior** — any schema with shared/public/team/own permissions or a `visibilityField`, or any call to `useYjs*`, `useMessages`, `useReactions`, `usePresence`, `useCanvas`, or shared scopes → `collab.spec.ts`. Open two users with the SDK fixture (`const [a, b] = await users(2)` after `import { test, expect } from 'deepspace/testing'`), act in one, assert in the other. This is the rule that catches "works for me, broken for the second user" regressions — do not skip it because the prompt didn't say "multi-user."
- **RBAC changes or permission tweaks** → `collab.spec.ts` with users of different roles, asserting what each can and cannot see/do.
- **Bug fix** → write the failing test first (reproducing the bug), then fix the code until it passes. Leave the test in the suite.

When the user asks for a change in a follow-up message, re-apply the Step 8 checklist to the new change and update the tests in the same turn — don't let them drift. The test suite is a living contract.

## Self-Diagnosis with Tests

When something isn't working, do **not** start with console logs. Start with:
1. Write (or tighten) a test that expresses the expected behavior.
2. Run it. Read the failure message and the failing selector/assertion.
3. Fix the code until the test passes.
4. Leave the test in place — it now guards against regression.

Console logs are a last resort, not a first step. A failing test tells you more than a log ever will: what was expected, what was observed, where in the flow it diverged. If a test is flaky or passes locally but fails in CI, investigate the flake — do not mark it `.skip` or delete it.

Don't make the user do the agent's debugging — having them click around the app and paste console output is not a substitute for running a Playwright test. Reach for that path only after a test has genuinely failed to reproduce the bug, and say so explicitly when you do.
