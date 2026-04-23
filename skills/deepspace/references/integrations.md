# DeepSpace Integrations Reference

All integrations are called through the api-worker proxy:

```typescript
import { integration } from 'deepspace'
const result = await integration.post('<integration-name>/<endpoint-name>', { ...params })
// Returns: { success: true, data: ... } or { success: false, error: "..." }
```

**Endpoint keys are two segments: `<integration>/<endpoint>`.** Use the exact names below — do not invent or paraphrase.

**Body shapes** — each entry lists the minimum required body (the one field you can't omit) and the most common optional fields. For full optional-parameter coverage (enum values, ranges, defaults) the api-worker's Zod schema is the source of truth — but a wrong body just returns `{ success: false, error: "..." }` in the envelope, so the fast path is: try the required shape below, then widen with optionals as needed. Realistic example values are shown; the endpoint doesn't care what you pass as long as the type matches.

## Billing & access control

The scaffold's `src/integrations.ts` defaults every integration to `billing: 'developer'` — the app owner pays. This is intentional: end-users of a deployed app shouldn't have to create a DeepSpace account or hand over a card just to use features that hit external APIs. The trade-off is that the integration proxy also lets **anonymous callers** through for `developer`-billed endpoints, so without a UI gate any visitor (or a bot finding the deployed URL) can fire `integration.post(...)` and the owner pays.

**Default rule: auth-gate any UI surface that triggers `integration.post(...)`.** Wrap the calling page or button behind `useAuth().isSignedIn` (see SKILL.md Step 4). The owner still pays — that's the model — but the surface is limited to signed-in users you can identify, count, and rate-limit per your app's own logic. Anonymous bots are stopped at the sign-in wall.

**Alternative for explicit user-pays apps: `billing: 'user'`.** If callers (not the owner) should pay, flip the integration in `src/integrations.ts`:
```ts
export const integrations: Record<string, { billing: 'developer' | 'user' }> = {
  google: { billing: 'user' },   // already in scaffold — required for OAuth
  // openai: { billing: 'user' },
}
```
The api-worker then 401s anonymous callers and bills the signed-in user's DeepSpace credits. This is enforced server-side, so it holds even if the UI gate is bypassed — but it does require every end-user to have a DeepSpace account with credits, which is usually only appropriate when each user has an obvious one-to-one relationship with their own costs (and you've told them so up front).

**Note for `google/*`**: keep `'user'`. OAuth tokens are stored per-user keyed by JWT subject — using `developer` would forward the owner's JWT and operate on the owner's connected Gmail/Drive/Calendar regardless of who's signed in client-side.

**Integration calls cost real money every test run.** `npx deepspace test` and `api.spec.ts` runs hit the real third-party API through the proxy — `developer`-billed calls charge the CLI user (`npx deepspace whoami`), `user`-billed calls charge the signed-in test account. Keep integration assertions minimal: one `integration.post(...)` per endpoint per test run, not a matrix. Never put integration calls inside `for` loops, retry-until-success polls, or parameterized test generators.

**Skip real `user`-billed endpoint calls in api.spec.ts.** Test accounts have no DeepSpace credits, so `user`-billed calls (e.g. `google/*`, or anything you've flipped to `'user'`) will 402 and the test will fail for the wrong reason. Don't "fix" this by temporarily flipping the integration to `'developer'` for tests — that silently bills the CLI user for calls the real app would have charged its end-users for, which is the opposite of what the developer chose.

**For the OAuth surface (Google), use `page.route(...)` to mock the connected and recovery branches.** The disconnected state is the easy half — fresh test accounts always show "Connect" so smoke.spec.ts can assert that with no mocks. But the connected-state UI (Disconnect button, events/data list, send-action affordances) and the requiresOAuth recovery prompt are non-trivial branches that fail silently in production if you don't exercise them. Minimum coverage:

```typescript
// 1. connected state renders Disconnect + data UI
await page.route('**/api/integrations/status', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ google: { connected: true, calendar: true, gmailSend: true } }),
  })
)
await page.route('**/api/integrations/google/calendar-list-events', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { items: [{ id: 'e1', summary: 'mock event', attendees: [{ email: 'a@x.com' }] }] } }),
  })
)
// → assert Disconnect button visible, mock event renders, Send button enabled

// 2. requiresOAuth recovery — note the nested `data` envelope
await page.route('**/api/integrations/google/gmail-send', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { requiresOAuth: true, provider: 'google', scopes: ['gmail.send'], authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?...' } }),
  })
)
// → assert reconnect prompt appears, page does NOT crash, no infinite retry loop

// 3. Disconnect button hits the right endpoint
let disconnectCalled = false
await page.route('**/api/integrations/oauth/google/disconnect', (route) => {
  disconnectCalled = true
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
})
// → click Disconnect, assert disconnectCalled === true, banner flips back
```

Real Google round-trips remain **deploy-and-manual-test only** — note that explicitly in `findings.md` so the gap is paper-trailed instead of forgotten.

## Endpoint catalog

Full endpoint specs — input schemas, descriptions, output schemas — live in YAML:

- Index: [`integrations.yaml`](./integrations.yaml) — all 215 endpoints grouped by integration, with one-line descriptions.
- Per-integration specs: [`integrations/<name>.yaml`](./integrations/) — one file per integration (38 total), with full input/output schemas.

Call pattern is always POST: `integration.post('<integration>/<endpoint>', body)`.

## Response Format

All endpoints return:
```typescript
{ success: true, data: <endpoint-specific> } | { success: false, error: string }
```

`data` shape varies by endpoint. Common pattern: `data` is the raw upstream response (often an array for list endpoints, object for detail endpoints). Do not assume nested keys like `data.list` or `data.results` without verifying — check `Array.isArray(result.data)` first.

**Empty-response gotcha (repeated from Finance):** some endpoints return `success: true` with empty or zero-filled data instead of an error when the upstream has no matches — notably `finnhub/stock-price` (all-zero quote) and `alphavantage/search-symbols` (`{ bestMatches: [] }`). Check for the empty state explicitly in addition to `success`.


## OAuth

Currently only `google` requires OAuth. Users connect once; tokens are stored and auto-refreshed by the platform. Users can grant scopes incrementally (Gmail first, then Calendar, etc.) — the platform unions new scopes with previously granted ones so badges stay accurate.

**There is no separate `google/auth-url` or `google/connect` endpoint.** To obtain an authUrl (e.g. for a "Connect Google" button), POST to any real `google/*` endpoint that needs the scope you want — the requiresOAuth response includes an authUrl built for that endpoint's scopes. Pick the endpoint that matches your UI's intent: `google/calendar-list-events` for a calendar feature, `google/gmail-list` for gmail read, `google/gmail-send` for gmail compose, `google/drive-list` for drive, etc. A "Connect Google" click handler and the load-data path can both target the same endpoint — the api-worker returns events when authorized and the requiresOAuth payload (with authUrl) when not, so one code path covers both.

**Each `google/*` endpoint requests only its own scope.** Posting to `google/calendar-list-events` requests `calendar.events` only — it does not also request `gmail.send` even if your app needs both. The platform's incremental-consent model means scopes accumulate one feature at a time, not all at once.

**Gate per-feature, never with an "all scopes ANDed" boolean.** The status endpoint returns per-scope flags (`calendar`, `gmail`, `gmailSend`, `gmailRead`, `drive`, `contacts`) precisely so UIs can render each feature as soon as its scope is granted. A single composite "isConnected = calendar && gmailSend" gate creates a deadlock: user grants calendar via the Connect button → status reports `calendar: true, gmailSend: false` → composite gate stays false → UI shows "not connected" → user can't reach the Send button that would request gmail.send → connection state is permanently stuck.

```typescript
// ❌ Deadlock pattern — user grants calendar, gate stays false, UI never advances.
const isConnected = status?.google?.connected
  && status?.google?.calendar
  && status?.google?.gmailSend
if (!isConnected) return <ConnectGoogleButton />

// ✅ Per-feature gating — calendar UI appears the moment calendar is granted;
//    gmail.send is requested lazily when the user clicks Send.
{status?.google?.calendar && <EventsList onSendRecap={attemptSend} />}

async function attemptSend(...) {
  const result = await integration.post('google/gmail-send', {...})
  const payload = (result.data ?? result) as Record<string, unknown>
  if (payload?.requiresOAuth && typeof payload.authUrl === 'string') {
    window.open(payload.authUrl as string, 'google-auth', 'width=500,height=600')
    // After popup closes, refresh status and retry the send.
  }
}
```

Pattern: render each feature whose scope is granted; on actions that need a not-yet-granted scope, attempt the call, the requiresOAuth response carries an authUrl pre-built for exactly that missing scope, retry after consent. The platform unions newly granted scopes with previously granted ones, so per-feature acquisition compounds correctly.

### Error shape when OAuth is needed

When a Google endpoint is called without stored tokens, without a required scope, or with a token that has been revoked/expired, the api-worker returns HTTP 200 with this envelope:

```typescript
{
  success: true,             // <-- yes, true. The OAuth-required payload
  data: {                    //     rides under data, not as a top-level error.
    requiresOAuth: true,
    provider: 'google',
    scopes: string[],        // scopes needed for this call
    authUrl: string          // redirect the user here to grant consent
  }
}
```

The platform produces this response for three distinct failures (no tokens, insufficient scope 403, revoked/invalid 401), so one check handles all of them. **Always check `result.data?.requiresOAuth`, never `result.requiresOAuth` or `result.success === false`** — the SDK forwards the api-worker's `data` field as-is, so the OAuth fields are nested one level down. (Do not grep for the legacy `error: 'not_connected'` string either; that shape no longer applies.)

Client pattern — always unwrap with `data ?? result` so the same code handles the OAuth-recovery payload (nested) and any past or future server-side flattening (top level):

```typescript
const result = await integration.post('google/gmail-send', { to, subject, content })
if (!result.success) return                       // network/proxy error
const payload = (result.data ?? result) as Record<string, unknown>
if (payload?.requiresOAuth && typeof payload.authUrl === 'string') {
  window.open(payload.authUrl, 'google-auth', 'width=500,height=600')
  // After the user completes consent, retry the call.
  return
}
// Otherwise `payload` is the upstream Google response (events, message, etc.)
```

This unwrap pattern is what existing production apps in this repo use for every google/* call — apply it consistently rather than reading `result.requiresOAuth` directly. The same pattern works for the upstream data too: e.g. for `calendar-list-events`, after the requiresOAuth check, `payload.items` is the events array.

### Connection status

`GET /api/integrations/status` (authenticated) returns per-scope flags so UIs can show accurate badges:

```typescript
{
  google: {
    connected: boolean,
    gmailSend: boolean, gmailRead: boolean, gmail: boolean,
    calendar: boolean, drive: boolean, contacts: boolean
  }
}
```

Broader scopes imply narrower ones — e.g., a token with `gmail.modify` reports `gmailSend` and `gmailRead` as `true` automatically.

### Disconnect

`DELETE /api/integrations/oauth/google/disconnect` (authenticated) revokes and clears the user's stored Google tokens.
