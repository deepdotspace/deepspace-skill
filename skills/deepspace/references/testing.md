# Testing

Load this reference when writing or updating a Playwright test, when `createTestUsers` errors with missing accounts, when a test fails and you need to decide how to diagnose, or when extending `smoke.spec.ts` / `api.spec.ts` / `collab.spec.ts` / per-feature specs. Skip it for conversation, planning, code-reading, or code changes whose runtime behavior is already covered by an existing test.

The build-phase testing workflow lives inline in `SKILL.md` Step 8 (when to run, which file to extend, debug-from-failures rule). This file covers the deeper surface: helpers, auth setup, cleanup conventions, route coverage, multi-user patterns, and self-diagnosis.

Every scaffolded app includes Playwright tests in `tests/` with helpers for auth, error tracking, and multi-user flows. Use these tests to verify your work — don't rely on manual testing or console logs to debug issues.

## Running Tests

```bash
npx playwright test              # run all tests
npx playwright test smoke.spec   # run a specific test file
```

No separate dev server required — the scaffolded `tests/playwright.config.ts` has a `webServer` block that starts Vite on port 5173 and reuses an existing one if present (`reuseExistingServer: true`).

## Scaffolded Test Files

- `smoke.spec.ts` — app loads, navigation renders, sign-in button present, page title correct
- `api.spec.ts` — API endpoints return expected responses, auth required where expected
- `collab.spec.ts` — multi-user: two users connect, see each other, data syncs between them

These three files are where every test lives. Installing a feature (e.g., `docs`, `kanban`, `messaging`) does not add a new spec file — extend these three per the Step 8 checklist in `SKILL.md`.

## Two layers of helpers

The SDK now ships two layers — pick based on the test you're writing:

### `deepspace/testing` — the published Playwright fixture (preferred for new multi-user tests)

The SDK publishes a `users` fixture and account helpers from `'deepspace/testing'` — built on top of cached `storageState` so each test account signs in **once** per machine, not once per test. This sidesteps Better Auth's per-IP rate limit on `/api/auth/sign-in/email` and is materially faster than `createTestUsers` for suites that grow.

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

### `tests/helpers/` (local — still scaffolded for single-user flows and error tracking)

Older or simpler suites also use the local helpers in `tests/helpers/`:

- `auth.ts` — `signInAs(page, email, password)`, `createTestUsers(browser, N)`, `loadLocalAccounts()`, `signOut(page)`. Reads credentials from `~/.deepspace/test-accounts.json`. Public sign-up is intentionally disabled server-side, so there is **no `signUp` helper**.
- `global-setup.ts` — warms up the auth worker before tests run.
- `errors.ts` — captures console errors and page errors during tests.

`createTestUsers` does not cache `storageState`, so it signs in fresh per test — fine for one or two specs, slow and rate-limit-prone for a larger suite. **Default to the `deepspace/testing` fixture for new multi-user tests**; keep `signInAs` / `loadLocalAccounts` for one-off single-user flows and the error-tracking helpers for any suite.

## Authenticated tests — use `npx deepspace test-accounts`

Public signup is intentionally disabled. Tests sign in (not sign up) using credentials created via the `deepspace test-accounts` CLI — the scaffold's `tests/helpers/auth.ts` already wires this up.

**If `createTestUsers` throws** saying there aren't enough local accounts, the error message prints exact copy-paste commands with a `Date.now()` millisecond timestamp that keeps them globally unique across developers and machines (the auth worker enforces email uniqueness at the user-table level):

```bash
npx deepspace login   # if not already
npx deepspace test-accounts create --email test-1-1776798210521@deepspace.test --password Pass123! --name "Test User 1"
npx deepspace test-accounts create --email test-2-1776798210521@deepspace.test --password Pass123! --name "Test User 2"
```

Credentials persist at `~/.deepspace/test-accounts.json` (mode 0600). Emails must end `@deepspace.test`. Max 10 per developer. Run as part of the same session — don't silently skip collab tests or punt with "requires manual QA." Run `npx deepspace test-accounts --help` for the full CLI.

## Writing New Tests

**Single-user flows** (CRUD, navigation, UI state): import `signInAs` and `loadLocalAccounts` from `./helpers/auth` and sign one page in.

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

> Existing suites may use `createTestUsers(browser, N)` from `./helpers/auth` with a `try/finally` that closes contexts manually. That still works, but prefer the fixture for new tests — it's faster (cached sign-in) and avoids rate limits.

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
| `src/pages/(protected)/<name>.tsx` (gated) | `signed-out` visitor sees `[data-testid="auth-overlay"]` visible AND the page's real content is NOT in the DOM. `signed-in` visitor sees real content + zero overlays. |
| Any route after a sign-out from inside `(protected)/` | After clicking Sign out, URL navigates to `redirectOnSignOut` (default `'/'`, which usually redirects on to `/home`). Assert the URL change happened AND the overlay didn't appear. The full-page `window.location.replace` is the SDK's safe-redirect; testing it catches the regression where users got stranded staring at the overlay. |

The `[data-testid="auth-overlay"]` attribute is on the SDK's `<AuthOverlay/>` — both the AuthGate's default fallback and the standalone usage. Querying for it is more reliable than text matching ("Sign in" appears in many places).

If you customize a `<AuthGate fallback={<TeaserPage/>}/>` to use a non-default fallback, swap the assertion to a stable selector inside your teaser instead.

## Proactive Test Authoring

Write and update tests **as you build**, not after. The Step 8 checklist in `SKILL.md` is the canonical trigger list — each rule names a condition on the code and a required test file. Don't duplicate those rules here; instead, treat this section as the worked-example elaboration:

- **New page / route / nav item** → `smoke.spec.ts`. Navigate to the page, assert the expected headline/components are visible, page has no errors. Dynamic routes (`/polls/:id`) need real-content assertions against a created record — see "Route coverage" below.
- **New CRUD feature** (items, posts, whatever — anything backed by a new schema) → `smoke.spec.ts` with a create → read → edit → delete happy path for a signed-in user.
- **New worker route, server action, AI chat route, cron handler, any `integration.post(...)` call, or any UI that relies on an HTTP-enforced auth/role check (e.g., an admin-only action button calling `/api/actions/<name>`, even when the route itself is pre-existing)** → `api.spec.ts`. For integration calls, POST to `/api/integrations/<endpoint>` and assert the envelope is `success: true` with the data the UI consumes — this catches wrong endpoint names, the most common integration-heavy-app failure. For routes/actions/AI/cron, assert status codes, response shape, and auth gating — including the negative path (unauthenticated or wrong-role caller gets 401/403) and other error cases (bad input, missing resources).
- **New multi-user behavior** — any schema with shared/public/team/own permissions or a `visibilityField`, or any call to `useYjs*`, `useMessages`, `useReactions`, `usePresence`, `useCanvas`, or shared scopes → `collab.spec.ts`. Create two users with `createTestUsers(browser, 2)`, act in one, assert in the other. This is the rule that catches "works for me, broken for the second user" regressions — do not skip it because the prompt didn't say "multi-user."
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
