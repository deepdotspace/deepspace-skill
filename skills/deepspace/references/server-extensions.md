# Server-Side Extensions

Beyond the frontend hooks and proxied integrations, the scaffold ships three worker-side extension points in `worker.ts`. Reach for them when browser-only code isn't enough.

**Load this reference when** the user asks for:
- Privileged writes that must bypass a calling user's role (server actions).
- A chat interface backed by Claude / OpenAI / Cerebras with tool use (AI chat).
- Scheduled background work — digests, cleanups, sync jobs (cron).

If the task is just "call an external API" or "read/write data as the user," you don't need this reference — use `integration.post(...)` from the client, or `useMutations` with RBAC.

---

## 1. Server actions (`src/actions/`) — bypass user RBAC for privileged writes

Actions are app-defined server functions called from the client with the user's JWT. They run **as the app** (via the `X-App-Action` header), so they can read/write data the user's own role can't — useful for workflows like "invite attendee, mutate both the event and the attendee's calendar" that shouldn't be gated by per-user RBAC.

Define in `src/actions/index.ts`:

```typescript
import type { ActionHandler } from 'deepspace/worker'

export const actions: Record<string, ActionHandler> = {
  inviteAttendee: async ({ userId, params, tools }) => {
    const eventId = params.eventId as string
    const attendeeId = params.attendeeId as string
    const event = await tools.get('events', eventId)
    if (!event.success) return event
    // tools.{create, update, remove, get, query, integration} bypass user RBAC
    await tools.update('events', eventId, { /* ... */ })
    return { success: true, data: { eventId } }
  },
}
```

Call from the client:

```typescript
const res = await fetch('/api/actions/inviteAttendee', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await getAuthToken()}` },
  body: JSON.stringify({ eventId, attendeeId }),
})
```

**Rules:**
- Actions require a signed-in caller — the JWT is validated before the action runs. `userId` in the context is the caller.
- Prefer actions over ad-hoc `fetch` endpoints so RBAC tools are uniform and tests can target `/api/actions/:name` directly.
- Don't put business logic that belongs in the DO (like permission checks) into actions — actions are for orchestration across collections or external calls.

---

## 2. AI chat (`src/ai/tools.ts` + `/api/ai/chat`) — streamed LLM with tool use

The scaffold ships a ready `/api/ai/chat` route that streams Claude responses with read-only tools over the app's own records. Use this instead of hand-rolling `integration.post('anthropic/chat-completion', ...)`:

- Streams tokens (Vercel AI SDK `streamText`, compatible with `useChat` on the client).
- Per-user billing — the caller's JWT is forwarded to the api-worker.
- Built-in tools: `schema.list`, `schema.describe`, `records.query`, `records.get`, `user.current` (read-only — the assistant can inspect but never mutate).
- `buildSystemPrompt(appName, schemas)` produces a concise prompt listing every collection and its columns.

To switch models or providers, edit the `model:` line in `worker.ts`'s `/api/ai/chat` handler — `createDeepSpaceAI(env, 'anthropic' | 'openai' | 'cerebras', { authToken })` returns a Vercel-AI-SDK-compatible provider. To expose new tools, edit `src/ai/tools.ts` (add names to `READ_ONLY_TOOL_NAMES`, or build custom tools with the `tool()` helper from `ai`).

Client-side, use `@ai-sdk/react`'s `useChat` hook pointed at `/api/ai/chat` — the scaffold includes `ai` and `framer-motion` as deps, and a reference feature lives at `.deepspace/features/ai-chat/`.

---

## 3. Cron (`src/cron.ts` + `AppCronRoom`)

For scheduled background work (digests, cleanups, sync jobs). The scaffold ships a per-app `AppCronRoom extends CronRoom` DO; tasks live in `src/cron.ts` and run on the DO's alarm. There is no `cron.json`, no `/internal/cron` endpoint, and no platform dispatch worker — every app schedules and runs its own work in its own DO.

Edit `src/cron.ts` to declare tasks and the runner:

```typescript
import type { CronTask } from 'deepspace/worker'
import { buildCronContext } from 'deepspace/worker'

export const tasks: CronTask[] = [
  { name: 'heartbeat', intervalMinutes: 1 },
  { name: 'daily-digest', schedule: '0 9 * * *', timezone: 'America/New_York' },
]

export async function runTask(name: string, env: Env): Promise<void> {
  const ctx = buildCronContext(env, env.OWNER_USER_ID, `app:${env.APP_NAME}`)
  if (name === 'heartbeat') {
    // ctx.tools.{create,update,remove,get,query} — same shape as server actions, runs as app owner
    // ctx.integration(endpoint, data) — proxied through api-worker, billed to the owner JWT
  } else if (name === 'daily-digest') {
    // ...
  }
}
```

**Task declaration rules:**
- Each task declares **either** `intervalMinutes` (every N minutes) **or** `schedule` + `timezone` (5-field cron expression evaluated against an IANA timezone). Declaring both, or neither, throws at DO construction time.
- Cron mode is DST-aware — the wall-clock comparison happens after the timezone shift.
- Optional `paused: true` starts the task disabled; toggle it later via the `useCronMonitor` UI.

The scaffolded `worker.ts` already wires `AppCronRoom` to the manifest and routes `/ws/cron/:roomId`:

```typescript
export class AppCronRoom extends CronRoom {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env, { tasks: cronTasks })
    this.env = env
  }
  protected async onTask(taskName: string): Promise<void> {
    await runCronTask(taskName, this.env)
  }
}
```

Don't edit those bindings — add tasks in `src/cron.ts` and the DO picks them up at construction.

**Monitoring UI** — render task status, history, and `trigger` / `pause` / `resume` controls with `useCronMonitor('app:<APP_NAME>')` from `deepspace`. The hook returns `{ tasks, history, connected, trigger(name), pause(name), resume(name) }`. Auth-gate the page (admin role) — the DO does not enforce who can call `trigger`/`pause`/`resume`, so without a client-side role check any signed-in user can fire owner-billed tasks.

**Testing cron without waiting for the schedule** — `trigger(taskName)` runs `onTask` immediately on the DO via the same code path as the alarm scheduler. So the right way to E2E-test cron is a Playwright spec that signs in as admin, navigates to `/cron`, clicks the "Run now" button (which calls `trigger(taskName)`), and asserts the new entry in `history` appears within a second. Don't write tests that wait for `0 9 * * 1-5` to fire — and don't change schedules to `intervalMinutes: 1` just for testing (use `trigger` instead). The only reason to use a 1-minute interval temporarily is to verify the alarm path itself, which `trigger` bypasses.

**Outbound calls in handlers** — `runTask` runs as the app owner. Use the `ctx` from `buildCronContext` for record mutations and integration calls; the api-worker bills `APP_OWNER_JWT`. For autonomous LLM calls use `createDeepSpaceAI(env, 'anthropic')` without `authToken` — it falls back to `APP_OWNER_JWT` automatically.

**Migration note** — if you find a stale `cron.json`, `handleCron`, `/internal/cron`, `verifyInternalSignature`, or `buildInternalPayload` in an existing app, those are the pre-`CronRoom` pattern. Delete them and rewrite to the shape above; `verifyInternalSignature` / `buildInternalPayload` still exist in `deepspace/worker` for other internal HMAC use, but cron does not need them.
