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
- `tests/feature-tests/tests/<feature-id>.spec.ts` — per-feature merge-gate specs (e.g., `docs.spec.ts` for the docs feature). Auto-discovered and run by the e2e harness when the feature is installed. When you add a custom feature, drop a `<feature-id>.spec.ts` alongside the others with multi-user assertions.

## Test Helpers (`tests/helpers/`)

- `auth.ts` — `signInAs(page, email, password)`, `createTestUsers(browser, N)`, `loadLocalAccounts()`, and `signOut(page)`. All read credentials from `~/.deepspace/test-accounts.json` (written by the `deepspace test-accounts` CLI). There is **no `signUp` helper** — public sign-up is intentionally disabled server-side. If the local file is missing accounts, `createTestUsers` throws an error that prints the exact commands to create them.
- `global-setup.ts` — warms up the auth worker before tests run.
- `errors.ts` — captures console errors and page errors during tests.

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

## Test data cleanup — tests must not pollute the dev DB

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

## Route coverage — every route must be tested

A smoke test that only loads `/` (or the home page) is not enough. If a route is reachable in the app — for example, static (`/polls`) or dynamic (`/polls/:id`) — there must be a test that:

1. Navigates to it (for dynamic routes: create a record first, grab its id, navigate).
2. Waits for the page's real content to appear (not just "no crash" — assert a specific element with real data, e.g., `expect(page.getByTestId('poll-question')).toContainText(questionText)`).
3. Fails loudly if the page renders an empty/not-found state when it shouldn't.

Passing a smoke test where the detail page silently shows "Poll not found" is the failure mode that shipped the group-poll regression. A "page loads without JS errors" assertion is insufficient — assert that the data that should be there **is** there.

## Proactive Test Authoring

Write and update tests **as you build**, not after. Every new page, feature, or user-visible change should trigger a corresponding test update in the same session — before saying "done":

- **New page / route / nav item** → extend `smoke.spec.ts`. Add a test that navigates to the page, asserts the expected headline/components are visible, and the page has no errors.
- **New CRUD feature** (items, posts, whatever) → extend `smoke.spec.ts` with a create/read/edit/delete happy path for a signed-in user.
- **New worker route, server action, AI chat route, cron handler, or any `integration.post(...)` call** → extend `api.spec.ts`. For integration calls, POST to `/api/integrations/<endpoint>` and assert the envelope is `success: true` with the data the UI consumes — this catches wrong endpoint names, the most common integration-heavy-app failure. For routes/actions/AI/cron, assert status codes, response shape, and auth gating.
- **New multi-user behavior** (sharing, invites, messages, presence, permissions, shared scopes) → extend `collab.spec.ts`. Create two users, act in one, assert in the other.
- **RBAC changes or permission tweaks** → add tests in `collab.spec.ts` with users of different roles, asserting what each can and cannot see/do.
- **Bug fix** → write the failing test first (reproducing the bug), then fix the code until it passes. Leave the test in the suite.

When the user asks for a change in a follow-up message, update the tests in the same turn — don't let them drift. The test suite is a living contract.

## Self-Diagnosis with Tests

When something isn't working, do **not** start with console logs. Start with:
1. Write (or tighten) a test that expresses the expected behavior.
2. Run it. Read the failure message and the failing selector/assertion.
3. Fix the code until the test passes.
4. Leave the test in place — it now guards against regression.

Console logs are a last resort, not a first step. A failing test tells you more than a log ever will: what was expected, what was observed, where in the flow it diverged. If a test is flaky or passes locally but fails in CI, investigate the flake — do not mark it `.skip` or delete it.
