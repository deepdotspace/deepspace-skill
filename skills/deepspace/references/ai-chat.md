# AI chat — streamed LLM with tool use

Load this reference when adding a chat interface backed by Claude / OpenAI / Cerebras with read-only tool calls over the app's records, switching the chat model/provider, or extending the tool surface beyond the built-ins. Skip it for one-shot LLM calls (use `integration.post('anthropic/chat-completion', ...)` instead) or for tasks that don't need an in-app chat UI.

## What ships in the scaffold

A ready `/api/ai/chat` route that streams Claude responses with read-only tools over the app's own records. Use this instead of hand-rolling `integration.post('anthropic/chat-completion', ...)` for any chat UI:

- **Streams tokens** (Vercel AI SDK `streamText`, compatible with `useChat` on the client).
- **Per-user billing** — the caller's JWT is forwarded to the api-worker, so the calling user's credits cover the call.
- **Built-in tools**: `schema.list`, `schema.describe`, `records.query`, `records.get`, `user.current` (read-only — the assistant can inspect but never mutate).
- **`buildSystemPrompt(appName, schemas)`** produces a concise prompt listing every collection and its columns.

## Reference implementation

`npx deepspace add ai-chat` installs a complete chat page wired to `/api/ai/chat`, including signed-out gating with `<AuthOverlay>` and inline tool-invocation rendering. Read its `src/AiChatPage.tsx` before writing your own — almost every chat UI just needs to adapt the styling.

## Client-side — the auth-token wrapper

`useChat` from `@ai-sdk/react` accepts a static `headers` object, but our auth tokens are dynamic. Wrap `fetch` to inject a fresh token on every request:

```tsx
import { useChat } from '@ai-sdk/react'
import { getAuthToken } from 'deepspace'

const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
  api: '/api/ai/chat',
  fetch: async (url, init) => {
    const token = await getAuthToken()
    const headers = new Headers(init?.headers)
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return fetch(url, { ...init, headers })
  },
})
```

## Switch model or provider

Edit the `model:` line in `worker.ts`'s `/api/ai/chat` handler. `createDeepSpaceAI(env, 'anthropic' | 'openai' | 'cerebras', { authToken })` returns a Vercel-AI-SDK-compatible provider. Pass `{ authToken }` for user-billed calls (inside a request handler); omit for server-side autonomous calls (falls back to `env.APP_OWNER_JWT`, billed to the app owner).

## Add a custom tool

Edit `src/ai/tools.ts`. The scaffold imports `BUILT_IN_TOOLS` from `deepspace/worker` and converts them; either extend `READ_ONLY_TOOL_NAMES` to expose more built-ins, or define a custom tool with `tool()` from `ai`.

## See also

- `references/sdk-reference.md` § AI tool helpers for `BUILT_IN_TOOLS`, `ToolSchema`, `buildSystemPrompt`, `buildReadOnlyTools` signatures.
- `references/integrations.md` for raw `integration.post('anthropic/...')` calls when you don't need streaming.
