# Google OAuth integration

Load this reference when wiring `google/*` integration calls (Gmail, Calendar, Drive, Contacts), building a "Connect Google" button, handling the `requiresOAuth` response, or writing tests that mock the OAuth surface. Skip it for non-Google integrations.

Currently `google` is the only integration that requires per-user OAuth. Tokens are stored and auto-refreshed by the platform. Users can grant scopes incrementally (Gmail first, then Calendar, etc.) — the platform unions new scopes with previously granted ones so badges stay accurate.

## Billing — must be `'user'`, never `'developer'`

In `src/integrations.ts`:

```ts
export const integrations: Record<string, { billing: 'developer' | 'user' }> = {
  google: { billing: 'user' },   // already in scaffold — non-negotiable
}
```

OAuth tokens are stored per-user keyed by JWT subject. With `'developer'` billing, the api-worker would forward the **owner's** JWT and operate on the owner's connected Gmail/Drive/Calendar regardless of who's signed in client-side. Always `'user'` for `google/*`.

## Authorize flow — there is no separate `auth-url` endpoint

To obtain an `authUrl` (e.g. for a "Connect Google" button), POST to any real `google/*` endpoint that needs the scope you want. The `requiresOAuth` response includes an `authUrl` built for that endpoint's scopes. Pick the endpoint that matches your UI's intent: `google/calendar-list-events` for a calendar feature, `google/gmail-list` for gmail read, `google/gmail-send` for gmail compose, `google/drive-list` for drive, etc. A "Connect Google" click handler and the load-data path can both target the same endpoint — the api-worker returns events when authorized and the `requiresOAuth` payload (with `authUrl`) when not, so one code path covers both.

Each `google/*` endpoint requests **only its own scope**. Posting to `google/calendar-list-events` requests `calendar.events` only — it does not also request `gmail.send` even if your app needs both. The platform's incremental-consent model means scopes accumulate one feature at a time, not all at once.

## Per-feature gating — never composite

Gate each UI feature on its own scope. A single composite `isConnected = calendar && gmailSend` boolean creates a deadlock: user grants calendar via the Connect button → status reports `calendar: true, gmailSend: false` → composite gate stays false → UI shows "not connected" → user can't reach the Send button that would request `gmail.send` → connection state is permanently stuck.

```typescript
// ❌ Deadlock pattern
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

Pattern: render each feature whose scope is granted; on actions that need a not-yet-granted scope, attempt the call, the `requiresOAuth` response carries an `authUrl` pre-built for exactly that missing scope, retry after consent. The platform unions newly granted scopes with previously granted ones, so per-feature acquisition compounds correctly.

## `requiresOAuth` response shape

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

This unwrap pattern is what existing production apps use for every `google/*` call — apply it consistently rather than reading `result.requiresOAuth` directly. The same pattern works for the upstream data too: e.g. for `calendar-list-events`, after the `requiresOAuth` check, `payload.items` is the events array.

## Connection status

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

## Disconnect

`DELETE /api/integrations/oauth/google/disconnect` (authenticated) revokes and clears the user's stored Google tokens.

## Testing — mock the OAuth branches

Real Google round-trips remain **deploy-and-manual-test only**. For automated tests, use `page.route(...)` to mock the connected and recovery branches. The disconnected state is the easy half — fresh test accounts always show "Connect" so `smoke.spec.ts` can assert that with no mocks. But the connected-state UI (Disconnect button, events/data list, send-action affordances) and the `requiresOAuth` recovery prompt are non-trivial branches that fail silently in production if you don't exercise them.

Minimum coverage:

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
// → assert reconnect prompt appears, page does not crash, no infinite retry loop

// 3. Disconnect button hits the right endpoint
let disconnectCalled = false
await page.route('**/api/integrations/oauth/google/disconnect', (route) => {
  disconnectCalled = true
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
})
// → click Disconnect, assert disconnectCalled === true, banner flips back
```

Note the gap explicitly in your `findings.md` if real Google round-trips aren't exercised, so it's paper-trailed instead of forgotten.
