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

## 3. Cron (`cron.json` + `src/cron.ts`)

For scheduled background work (digests, cleanup, syncing):

- Add tasks to `cron.json`:
  ```json
  { "tasks": [{ "name": "daily-digest", "schedule": "0 9 * * *" }] }
  ```
- Handle them in `handleCron(payload)` in `src/cron.ts`. The worker's `/internal/cron` endpoint is HMAC-authed (verified via `verifyInternalSignature` + `buildInternalPayload` from `deepspace/worker`) and called by the platform's dispatch worker — you don't invoke it yourself.
- Cron handlers run server-side as the app owner; use `createDeepSpaceAI(env, ...)` (falls back to `APP_OWNER_JWT`) for autonomous LLM calls, and direct DO access for mutations.
