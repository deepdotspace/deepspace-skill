# DeepSpace SDK Reference

Complete surface of what the `deepspace` npm package exports. For exact type signatures, read `node_modules/deepspace/dist/index.d.ts` (frontend) and `node_modules/deepspace/dist/worker.d.ts` (worker). This file is a navigable index — use it to discover what exists, then consult `.d.ts` for signatures.

**Import paths:**
```typescript
import { ... } from 'deepspace'          // frontend / React
import { ... } from 'deepspace/worker'   // Cloudflare Worker
```

---

## Frontend (`deepspace`)

### Auth

**Providers**
- `DeepSpaceAuthProvider` — wraps the tree; required for all auth hooks.

**Components**
- `AuthOverlay` — modal sign-in UI. Render without `onClose`, gated by `!isSignedIn`; auto-hides when signed in.
- `SignedIn` / `SignedOut` — conditional rendering based on auth state.
- `AuthGate` — renders `children` when signed in, `fallback` otherwise.
- `GuestBanner` — inline banner prompting sign-in.

**Hooks**
- `useAuth()` — `{ isSignedIn, ... }`. Primary auth check. Session-based, updates immediately.
- `useAuthUser()` — auth-layer user (Better Auth session).
- `useUser()` — storage-layer user `{ id, name, email, role }`. Loads async.
- `useDisplayName()` — resolved display name or null.

**Utilities**
- `getAuthToken()` / `clearAuthToken()` — token access.
- `signIn` / `signOut` — from `authClient`. Use `signOut()` for logout.
- `authClient` / `useSession` — Better Auth client re-exports.

### Records (data layer)

**Providers**
- `RecordProvider` — WebSocket + store. Props: `roomId`, `schemas`, `wsUrl`, `allowAnonymous`, `getAuthToken`.
- `RecordScope` — binds a scope (app room or shared). Props: `roomId`, `schemas`, `appId`, `sharedScopes`, `wsUrl`, `wsPathPrefix`, `isolated`.
- `ScopeRegistryProvider` — required once near the root if using shared scopes.

**Hooks**
- `useQuery<T>(collection, options?)` — `{ records, status, error }` where `status: 'loading' | 'ready' | 'error'`. Options: `where`, `orderBy`, `orderDir`, `limit`. **Each record is an envelope** — `{ recordId, data: T, createdBy, createdAt, updatedAt }`. User fields live under `.data`: write `r.data.title`, never `r.title`. Use `r.recordId` for keys and to pass into `put` / `remove`. Common bug: `records.map(r => r.title)` returns `undefined` for every row (TS catches it; runtime renders empty list).
- `useMutations<T>(collection)` — `{ create, put, remove, createConfirmed, putConfirmed, removeConfirmed }`. **`create` returns `Promise<string>`** (the new recordId — capture it for navigation: `const id = await create({...}); navigate(\`/items/${id}\`)`). `put` and `remove` return `Promise<void>`. The `*Confirmed` variants resolve only after the server has acknowledged the write; the plain ones return immediately after the optimistic local apply.
- `useUsers()` — all users in the room.
- `useUserLookup()` — `{ getUser(id), getEmail(id), getName(id), getRole(id), getImageUrl(id), usersLoaded }`. O(1) wrapper around `useUsers()` for resolving a userId from the wire (e.g., a `MessageRecord.AuthorId`) to display fields without scanning the full users array each render.
- `useRecordContext()` — low-level store access.

**Classes**
- `RecordStore` — the in-memory store (usually consumed via hooks).

### Messaging (channel-based)

Requires channels + messages schemas in the room.

- `useChannels()` — `{ channels, create, ... }`.
- `useMessages(channelId, options?)` — `{ messages, send, edit, remove }`.
- `useReactions(channelId)` — `{ getReactionsForMessage, toggle }`.
- `useChannelMembers(channelId)` — `{ isMember, join, leave }`.
- `useReadReceipts()` — `{ markAsRead, getUnreadCount }`.
- `useConversation(options?)` — for **DM/conversation DOs** (scope `conv:<id>`) backed by the `conv_messages` / `conv_reactions` / `conv_members` collections. Returns a single `ConversationObject` with `{ messages, reactions, members, send, edit, remove, toggleReaction }`. **Different from `useMessages` / `useReactions` / `useChannelMembers`**, which target the channel-style collections (`messages` / `reactions` / `channel_members`). Use `useConversation` only when mounted inside a `RecordScope` for a `conv:<id>` DO; use the channel hooks for `app:<APP_NAME>` channels.

**Helpers**
- `groupReactionsForMessage(reactions, messageId, currentUserId)`
- `shouldGroupMessages(current, previous, options?)`
- `getThreadCounts(messages)`
- `formatMessageTime(dateStr)` / `formatFullTimestamp(dateStr)`
- `getConversationDisplayName(conv)` / `getConversationParticipantIds(conv)`
- `isDMConversation(type)`
- `parseMessageMetadata(raw)`

### Directory (cross-app, shared scope)

- `useConversations()` — `{ conversations, createChannel, createDM }`.
- `useCommunities()` — `{ communities, createCommunity, joinCommunity }`.
- `usePosts(options?)` — `{ posts, createPost }`.

### Real-time collab (Yjs-based)

- `useYjsField(collection, recordId, fieldName)` — collaborative rich data in a field.
- `useYjsText(collection, recordId, fieldName)` — collaborative text input (for textareas / contenteditable).
- `useYjsRoom(docId, fieldName)` — standalone collab doc, not tied to a record.
- `useCanvas(roomId)` — collaborative canvas state.
- `usePresence(options?)` — cursor/user presence inside the current `RecordScope`. Convenience wrapper that picks the active scope's presence channel; use this for app-default presence.
- `usePresenceRoom(scopeId)` — presence on an **explicit** PresenceRoom scope (its own DO at `/ws/presence/:scopeId`). Pass any string (`canvas:${id}`, `thread:${channelId}`, `doc:${docId}`). Returns `{ peers, connected, updateState(state) }`. `updateState` merges, so you can call it for cursor (`{ cursor: { x, y } }`), typing (`{ typing: true }`), viewport, etc. Each peer is `{ userId, userName, userEmail, userImageUrl?, joinedAt, state }`. Self is excluded from `peers`.
- `useGameRoom(roomId)` — connects to a `GameRoom` DO at `/ws/game/:roomId`. Returns `{ state, tick, players, running, connected, sendInput(action, data?), setReady(), startGame(), endGame() }`. Each player is `{ userId, userName, ready, connectedAt, data }`. State migration on schema bumps lives in the worker — override `onHydrateState(stored)` on the DO subclass.
- `useCronMonitor(roomId)` — admin/monitor stream for the `AppCronRoom` DO. Pass `app:<APP_NAME>` for the app's default cron room. Returns `{ tasks, history, connected, trigger(name), pause(name), resume(name) }`. Each task is `{ name, intervalMinutes, schedule, timezone, paused, lastRunAt, nextRunAt }`. `trigger(name)` fires `onTask(name)` immediately on the DO — same path as the alarm scheduler — so a "Run now" button is the right way to E2E-test cron without waiting for the schedule. **The DO does not enforce a role on `trigger`/`pause`/`resume`** — gate the admin UI client-side by `useUser().role === 'admin'` (anyone signed in can otherwise fire tasks, which matters if a task spends owner credits via integrations).

> Audio/video rooms have no SDK hook. Use the `livekit/*` endpoints (`create-room`, `generate-token`, `list-rooms`, `delete-room`) via `integration.post(...)` — see `references/integrations.md`.

**Collaborative text input** — bind a `<textarea>` to a Yjs text field and multiple users editing the same record see each other's keystrokes live:

```tsx
import { useYjsText } from 'deepspace'

function DocEditor({ docId }: { docId: string }) {
  const { text, setText, loading } = useYjsText('docs', docId, 'body')
  if (loading) return <div>Loading…</div>
  return <textarea value={text} onChange={e => setText(e.target.value)} />
}
```

**Presence** — show who else is in the room and where their cursors are:

```tsx
import { usePresence } from 'deepspace'

function CursorOverlay() {
  const { peers, setCursor } = usePresence()
  return (
    <div onMouseMove={e => setCursor({ x: e.clientX, y: e.clientY })}>
      {peers.map(p => (
        <div key={p.userId} style={{ position: 'absolute', left: p.cursor?.x, top: p.cursor?.y }}>
          {p.name}
        </div>
      ))}
    </div>
  )
}
```

Exact return shapes vary — check `node_modules/deepspace/dist/index.d.ts` for the precise types (`UseYjsTextResult`, `UsePresenceOptions`, etc.).

**Sync primitives (low-level, rarely needed)**
- `createEncoder` / `createDecoder`
- `toUint8Array`, `writeVarUint`, `writeVarUint8Array`, `readVarUint`, `readVarUint8Array`
- `encodeSyncStep1`, `encodeSyncStep2`, `encodeUpdate`, `handleSyncMessage`
- `Awareness`, `encodeAwarenessMessage`, `handleAwarenessMessage`
- `getMessageType`
- Message type constants: `MSG_SYNC`, `MSG_AWARENESS`, `MSG_SYNC_STEP1`, `MSG_SYNC_STEP2`, `MSG_SYNC_UPDATE`.

### Files (R2)

- `useR2Files(options?)` — `{ files, upload, remove, getUrl, ... }`. Options: `R2Scope` to scope by room/user.
- `isImageFile(mimeType)` / `formatFileSize(bytes)` — display helpers.

```tsx
import { useR2Files, isImageFile, formatFileSize } from 'deepspace'

function Gallery() {
  const { files, upload, remove, getUrl } = useR2Files()

  async function onDrop(file: File) {
    await upload(file) // returns the stored file record; triggers a re-render
  }

  return files.map(f => (
    <div key={f.id}>
      {isImageFile(f.mimeType) && <img src={getUrl(f)} referrerPolicy="no-referrer" />}
      <span>{f.name} ({formatFileSize(f.size)})</span>
      <button onClick={() => remove(f.id)}>Delete</button>
    </div>
  ))
}
```

> ⚠️ **Local-dev limitation**: R2 upload round-trips require `APP_IDENTITY_TOKEN`, a secret minted by the deploy worker. The CLI does not currently provision it locally, so uploads will return 401 from the platform worker. In local dev, assert that `upload()` is dispatched (not the full round-trip); full flow works after `npx deepspace deploy`.

### Platform / Integrations

- `integration` — `{ get / post / put / delete (endpoint, data?, options?) }`. Returns `Promise<IntegrationResponse<T>>` where the envelope is `{ success: true, data } | { success: false, error }`. See `references/integrations.md` for endpoint list and the `requiresOAuth` retry shape.

**Cross-app platform context (opt-in, NOT in the scaffold by default).** The platform exports below let an app subscribe to its cross-app inbox (DMs / notifications routed through the platform-worker). They require `<PlatformProvider>` to be mounted somewhere above the consumers — the scaffolded `_app.tsx` does **not** include it, so wrap the tree manually if you need this surface:

```tsx
import { PlatformProvider, usePlatform, useInbox } from 'deepspace'
// inside _app.tsx, ABOVE <RecordProvider>:
<PlatformProvider>{/* ...rest of tree... */}</PlatformProvider>
```

- `PlatformProvider` — context wrapper. Inbox WebSocket activates only when at least one component subscribes via `useInbox()` (zero-cost otherwise).
- `usePlatform()` — `{ platformFetch(path, init?), inbox, subscribeInbox }`. Throws if no `<PlatformProvider>` is mounted. `platformFetch` prepends `/platform` and adds the auth header automatically.
- `useInbox()` — `InboxEntry[]`. Each entry: `{ conversationId, scope, displayName, muted, joinedAt, lastMessageAt, lastMessagePreview, lastMessageAuthor, unreadCount }`.
- `usePlatformWS<S>(options)` — generic platform WebSocket subscription (`PlatformWSOptions` / `PlatformWSResult`). For the rare case you need a custom platform-side stream beyond the inbox.
- `PlatformContext` — raw context. Almost never needed; consume via `usePlatform()`.

**OAuth management endpoints** (authenticated, app-worker-proxied — call via `fetch` with the session token):
- `GET /api/integrations/status` — per-scope connection flags for all OAuth providers (currently only `google`). Response shape and per-scope fields documented in `references/integrations.md` → OAuth section.
- `DELETE /api/integrations/oauth/:provider/disconnect` — revoke and clear the current user's stored tokens.

For the `requiresOAuth` response shape and client retry pattern, see `references/integrations.md` → OAuth section.

### Theming

- `DeepSpaceThemeProvider` — wraps the tree with theme tokens.
- `useIsDarkTheme()` — boolean.
- `isDarkColor(color)` — luminance check.
- `applyDeepSpaceTheme(config, root?)` / `clearDeepSpaceTheme(root?)` / `readThemeFromDOM(root?)`
- `applyUIThemeTokens(theme, root?, accent?)` — sets UI CSS variables.
- `DEEPSPACE_THEME_PROPERTIES` — list of CSS custom properties the theme defines.

### User colors

- `DEFAULT_USER_COLORS` — frozen 12-color palette of cursor/avatar tints.
- `getUserColor(userId, palette?)` — deterministic hash → palette index. Same userId always returns the same color across sessions. Use it for cursor dots in `usePresence` / `usePresenceRoom`, avatar fallbacks, and "who's typing" pills. Pass a custom palette to match a brand.

### UI primitives (SDK-provided)

> ⚠️ The scaffolded app usually includes its own versions of these in `src/components/ui/`. Check `_app.tsx` to see which `ToastProvider` is wrapped in the tree before importing `useToast`. Mixing SDK and local contexts produces `useToast must be used within ToastProvider`.

- `ToastProvider` — context for toasts.
- `useToast()` — returns `{ success, error, warning, info }` (or equivalent).

### Environment

- `detectEnvironment()` / `getEnvironmentConfig()` — `'dev' | 'preview' | 'prod'`.
- `getApiUrl()` / `getPlatformWorkerUrl()` / `getAuthUrl()` — resolved service URLs.
- `isLocalDev()` / `isProduction()` — booleans.
- `resetEnvironmentCache()` — test helper.
- `ENV` — resolved config object.

### RBAC

- `ROLES` / `ROLE_CONFIG` — role constants and their read/write defaults.

---

## Worker (`deepspace/worker`)

### Base classes

The scaffold declares five DO classes in `__DO_MANIFEST__` and extends these bases in `worker.ts` — do not add a new DO class without updating the manifest and wrangler migrations.

- `RecordRoom` — primary app data DO. Extend with your `schemas`:
  ```typescript
  export class AppRecordRoom extends RecordRoom {
    constructor(state: DurableObjectState, env: Env) {
      super(state, env, schemas, { ownerUserId: env.OWNER_USER_ID })
    }
  }
  ```
- `YjsRoom` — per-doc collaborative text (Y.Text) and rich fields.
- `CanvasRoom` — collaborative canvas state (shapes, strokes).
- `PresenceRoom` — cursors, typing indicators, "who's online".
- `CronRoom` — scheduled-task DO. Construct with `{ tasks: CronTask[] }` and override `onTask(name)`. See `references/server-extensions.md` § Cron for the scaffold pattern.

Each has its own WebSocket route wired in `worker.ts` (`/ws/yjs/:docId`, `/ws/canvas/:docId`, `/ws/presence/:scopeId`, `/ws/cron/:roomId`).

> No `MediaRoom` — LiveKit replaces it. Use `livekit/*` integration endpoints (see `references/integrations.md`).

### Game rooms (state migration)

Subclasses of `GameRoom` can override `onHydrateState(stored)` to migrate persisted game state when redeploying with a schema change. Use it for:

- **Evolving schemas** — merge new fields into existing stored state.
- **Version bumps** — transform old shapes to new ones.
- **Fresh starts** — discard stale blobs and return a default state.

Omit the override to keep the legacy behavior (load the stored blob as-is).

### Auth
- `verifyJwt(request, env)` — validates the session JWT, returns `{ userId, ... }` or throws.
- `verifyInternalSignature({ secret, payload, signature, timestamp })` / `buildInternalPayload(body)` — HMAC sign / verify for internal platform → app calls. (Cron no longer uses these — see `references/server-extensions.md` § Cron.)

### AI provider helper
- `createDeepSpaceAI(env, provider, options?)` — returns a Vercel-AI-SDK-compatible provider routed through the DeepSpace API worker. `provider` is `'anthropic' | 'openai' | 'cerebras'`. Pass `{ authToken }` for user-billed calls (inside a request handler); omit for server-side autonomous calls (falls back to `env.APP_OWNER_JWT`, billed to the app owner).

### Server action types
- `ActionHandler` — `(ctx: ActionContext) => Promise<ActionResult>`.
- `ActionContext` — `{ userId, params, tools }`. `tools` exposes `create / update / remove / get / query` (bypass user RBAC) and `integration(endpoint, data)`.
- `ActionResult` — `{ success: boolean, data?: unknown, error?: string }`.

### AI tool helpers (from `deepspace/worker`)
- `BUILT_IN_TOOLS` — catalog of read-only tool definitions.
- `ToolSchema` — tool-definition type.
- See `src/ai/tools.ts` in the scaffold for `buildSystemPrompt(appName, schemas)` and `buildReadOnlyTools(executor)` — both are app-local by default (the scaffold ships a reference implementation you can edit to add custom tools).

### R2 helpers
- `createScopedR2Handler(...)` — route handler for scoped R2 reads/writes.

### Upstream worker proxy helpers

The scaffolded `worker.ts` already uses these for every cross-worker call (auth proxy, integration proxy, file proxy, AI helper) — you rarely need to call them directly, but you do need to keep them when editing `worker.ts` so the same code works in dev and prod.

- `apiWorkerFetch(env, path, init?)` — fetch the api-worker. Prefers the `API_WORKER` service binding; falls back to `API_WORKER_URL`.
- `platformWorkerFetch(env, pathOrRequest, init?)` — fetch the platform-worker. Accepts either a path string or a full `Request` (so you can hand off `c.req.raw` derivatives with method/headers/body intact). Prefers `PLATFORM_WORKER` binding; falls back to `PLATFORM_WORKER_URL`.
- `authWorkerFetch(env, path, init?)` — fetch the auth-worker. URL-only by design (`AUTH_WORKER_URL`); the auth-worker has no service binding so `Set-Cookie` headers stay verbatim over plain HTTPS.
- Env interface types: `ApiWorkerEnv`, `PlatformWorkerEnv`, `AuthWorkerEnv`. Extend the app's `Env` from these (the starter does).
- Each helper throws an actionable Error if neither transport is configured. **Do not** replace these with raw `c.env.X.fetch(...)` — `wrangler dev` doesn't surface service bindings cross-process for SDK apps, so the binding is `undefined` locally and the fetch silently fails. The helpers paper over the dev/prod mismatch.

Production note: cross-worker calls over plain `*.workers.dev` URLs return Cloudflare error 1042 in production. The service binding is the only working transport for deployed apps; the URL fallback is a dev-only convenience the CLI writes into `.dev.vars`. If a deployed app needs `apiWorkerFetch` / `platformWorkerFetch`, the corresponding `[[services]]` binding must be in `wrangler.toml`.

### Schema constants (drop-in collections)
- `USERS_COLUMNS` — standard users columns.
- `CHANNELS_SCHEMA` — channels collection.
- `MESSAGES_SCHEMA` — messages collection.
- `WORKSPACE_SCHEMAS` — shared-scope collections (email handles, etc.) — pass as `schemas` to a `workspace:default` shared scope to let apps read cross-app user identity (e.g., a user's claimed `@app.space` email handle). Handles are managed by the mail app; other apps query via `useQuery('email_handles', { where: { UserId: user?.id } })` to resolve a user's address for outbound email.
- Others for reactions, channel_members, read_receipts, posts, communities, conversations, etc. — check `deepspace/worker` types for the full list.

---

## Not listed here?

Two places to look:
1. `node_modules/deepspace/dist/index.d.ts` — authoritative type surface for frontend.
2. `node_modules/deepspace/dist/worker.d.ts` — authoritative type surface for worker.

If a hook or type isn't in this reference, it probably exists in `.d.ts`. Read the declaration to get the exact signature. Do not guess.
