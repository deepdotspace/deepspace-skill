# Server actions — privileged writes that bypass user RBAC

Load this reference when adding privileged server-side mutations that need to bypass per-user role checks (admin actions, multi-collection orchestration, "as the app" writes), or when wiring a button on a page that needs to escalate beyond what `useMutations<T>()` allows. Skip it if the operation can be done with the caller's own RBAC.

## What server actions are

Actions are app-defined server functions called from the client with the user's JWT. They run **as the app** (via the `X-App-Action` header), so they can read/write data the user's own role can't — useful for workflows like "invite attendee, mutate both the event and the attendee's calendar" that shouldn't be gated by per-user RBAC.

## Define in `src/actions/index.ts`

```typescript
import type { ActionHandler } from 'deepspace/worker'

interface EventData {
  attendeeIds?: string[]
  // … other event fields
}

export const actions: Record<string, ActionHandler<Env>> = {
  // Add an attendee and stamp the event's attendeeIds in one privileged write.
  inviteAttendee: async ({ params, tools }) => {
    const eventId = params.eventId as string
    const attendeeId = params.attendeeId as string

    // tools.get returns { success, data: { record } } where `record` is the envelope
    // { recordId, data: <your fields>, createdBy, createdAt, updatedAt }.
    const event = await tools.get('events', eventId)
    if (!event.success) return event
    const { record } = event.data as { record: { data: EventData } }
    const current = record.data.attendeeIds ?? []

    const next = [...new Set([...current, attendeeId])]
    return tools.update('events', eventId, { attendeeIds: next })
  },
}
```

`tools.{create, update, remove, get, query}` **all** bypass user RBAC — including `tools.query`. An action that calls `tools.query('events')` always sees every event in the collection, not just the caller's. If you need caller-scoped reads, do them client-side via `useQuery` (which the DO RBAC governs) or pass a `where` clause in the action.

`ActionResult<T>` is a discriminated union — narrow with `if (result.success)` before reading `result.data`. **Response shapes** (under `.data` when `success` is true):
- `tools.get(coll, id)` → `{ record: { recordId, data, createdBy, createdAt, updatedAt } }`
- `tools.query(coll, opts?)` → `{ records: Envelope[], count: number }`
- `tools.create(coll, data, recordId?)` → `{ recordId, record: Envelope }`. The optional third arg upserts at a known key — use it when the recordId is derived from external identity (e.g., `tools.create('users', userData, userId)` to seed a users row keyed by Better Auth's user id, instead of letting the DO mint a random recordId).
- `tools.update(coll, id, patch)` → `{ recordId, record: Envelope }`
- `tools.remove(coll, id)` → `{ deleted: true }`
- `tools.integration<T>(endpoint, data?)` — proxies to the api-worker. **No envelope wrapper:** on success `result.data` *is* the integration's response body directly (e.g. `result.data.choices` for `openai/chat-completion`, `result.data.images` for `freepik/generate-image`). Pass `<T>` to type it. **Billing depends on `src/integrations.ts`**: an integration set to `{ billing: 'developer' }` calls with `APP_OWNER_JWT` (owner pays); any other value (default: `'user'`) forwards the caller's JWT (caller pays). The api-worker bills the JWT subject; there is no client-supplied override.

The typed surface is generic per op (`tools.query<T>`, `tools.get<T>`, etc.), so passing a row type narrows `record.data` / `records[].data` to `T` instead of `Record<string, unknown>`.

> Type vs wire: the published `MutateActionData` interface only declares `{ recordId }` — TypeScript will reject `result.data.record` even though the value exists at runtime. If you need the post-write envelope, either re-query (`tools.get(coll, result.data.recordId)`) or cast: `(result.data as { recordId: string; record: Envelope }).record`.

## Owner-only gate (when an action burns owner resources)

If the action spends owner credits or touches owner-only state, gate it explicitly. The `OWNER_USER_ID` env binding is set at deploy time:

```typescript
import type { ActionHandler } from 'deepspace/worker'
interface OwnerEnv { OWNER_USER_ID?: string }

export const recomputeAnalytics: ActionHandler<OwnerEnv> = async (ctx) => {
  if (ctx.env.OWNER_USER_ID && ctx.userId !== ctx.env.OWNER_USER_ID) {
    return { success: false, error: 'Forbidden: owner only' }
  }
  // ...privileged work...
  return { success: true, data: {} }
}
```

This pattern is the one the SDK's own `testing` feature uses (see `cpu-burn-action.ts` in `npx deepspace add testing`).

## Call from the client

```typescript
import { getAuthToken } from 'deepspace'

const res = await fetch('/api/actions/inviteAttendee', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${await getAuthToken()}`,
  },
  body: JSON.stringify({ eventId, attendeeId }),
})
const { success, data, error } = await res.json()
```

## Rules

- Actions require a signed-in caller — the JWT is validated before the action runs. `userId` in the context is the caller.
- Prefer actions over ad-hoc `fetch` endpoints so RBAC tools are uniform and tests can target `/api/actions/:name` directly.
- Don't put business logic that belongs in the DO (like permission checks) into actions — actions are for orchestration across collections, owner-gated work, or external calls.

## Testing

A server action is a single POST endpoint, so `api.spec.ts` is the right home. Cover the happy path, the unauthenticated 401, and the wrong-role 403:

```typescript
test('inviteAttendee adds attendee for signed-in caller', async ({ request, baseURL }) => {
  // Sign in via your test helper, get the JWT, then POST.
  const token = await signInAsAndGetToken(request, /* ... */)
  const res = await request.post(`${baseURL}/api/actions/inviteAttendee`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { eventId: 'evt_1', attendeeId: 'usr_2' },
  })
  expect(res.status()).toBe(200)
  expect(await res.json()).toMatchObject({ success: true })
})

test('inviteAttendee rejects unauthenticated callers', async ({ request, baseURL }) => {
  const res = await request.post(`${baseURL}/api/actions/inviteAttendee`, {
    headers: { 'Content-Type': 'application/json' },
    data: { eventId: 'evt_1', attendeeId: 'usr_2' },
  })
  expect(res.status()).toBe(401)
})
```

## Types

- `ActionHandler` — `(ctx: ActionContext) => Promise<ActionResult>`.
- `ActionContext` — `{ userId, params, tools, env, callerJwt }`. `tools` exposes `create / update / remove / get / query` (bypass user RBAC) and `integration(endpoint, data)`. **`callerJwt: string`** is the verified Bearer token the action was invoked with — forward it (`Authorization: Bearer ${ctx.callerJwt}`) on any outbound platform request that needs the user's identity (e.g., a `deploy-worker /api/apps` ownership check, or any `apiWorkerFetch` / `platformWorkerFetch` call where the caller must be the authenticated subject, not the app). Do **not** echo it into logs or response bodies.
- `ActionResult` — `{ success: boolean, data?: unknown, error?: string }`.

See `references/sdk-reference.md` § Server action types for the canonical signatures.
