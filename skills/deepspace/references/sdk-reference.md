# DeepSpace SDK Reference

Load this reference when you need to confirm an export exists, look up a hook signature, pick between two similar APIs (e.g., `useMessages` vs `useConversation`, `usePresence` vs `usePresenceRoom`), or audit the worker / testing surface. Skip it when the topic has its own reference — `auth.md`, `schemas.md`, `server-actions.md`, `ai-chat.md`, `cron.md`, `bindings.md`, `integrations.md`, `testing.md`, `domain.md`, `architecture.md`, `uiux.md`, and `landing-design.md` cover their surfaces in task-shaped depth that this index does not.

Complete surface of what the `deepspace` npm package exports. For exact type signatures, read `node_modules/deepspace/dist/index.d.ts` (frontend), `node_modules/deepspace/dist/worker.d.ts` (worker), `node_modules/deepspace/dist/server.d.ts` (platform-backed server helpers), and `node_modules/deepspace/dist/testing.d.ts` (Playwright fixture). This file is a navigable index — use it to discover what exists, then consult `.d.ts` for signatures.

**Import paths:**
```typescript
import { ... } from 'deepspace'          // frontend / React
import { ... } from 'deepspace/worker'   // Cloudflare Worker (DOs, schemas, JWT, metering)
import { ... } from 'deepspace/server'   // platform-backed worker helpers (subscriptions, refunds, screenshot)
import { ... } from 'deepspace/testing'  // Playwright multi-user fixture (test files only)
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
- `useAuth()` — `{ isLoaded, isSignedIn, userId, sessionId }`. Primary auth check. Session-based; `isLoaded` flips true once the first Better Auth session check resolves and **stays true** for the page's lifetime (does not flap back to false on background refetches / tab refocus) — safe to gate `RecordProvider` / data-layer mounts on it without remount churn. `isSignedIn` updates immediately on sign-in / sign-out.
- `useAuthUser()` — `{ isLoaded, isSignedIn, user }` where `user` is the auth-layer user (Better Auth session: `{ id, fullName, firstName, primaryEmailAddress, ... } | null`). Different from `useUser()`, which returns the storage-layer user with karma/credits/role merged in.
- `useUser()` — `{ user, isLoading, refetch }`. The `user` object is the storage-layer user (`{ id, name, email, role, karma, credits, ... } | null`); destructure as `const { user } = useUser(); user?.id`, **not** `const { id } = useUser()`. Loads async.
- `useAuthStatus({ requireSignedIn? })` — auth-only readiness helper. Returns `useAuth()` fields plus `{ status, isReady }`; safe outside `<RecordProvider>`.
- `useAuthProfileReady({ requireSignedIn?, requireUser? })` — profile-aware readiness helper under `<RecordProvider>`. Returns `useAuth()` fields plus `{ user, userLoading, refetchUser, status, isReady }`.
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
- `useMutations<T>(collection)` — `{ create, put, remove, createConfirmed, putConfirmed, removeConfirmed }`. **`create(data: T)` takes the full record shape** (no existing row to merge into) and returns `Promise<string>` (the new recordId — capture it for navigation: `const id = await create({...}); navigate(\`/items/${id}\`)`). **`put(recordId, patch: Partial<T>)`** is merge-semantics — the server does `{...existing, ...patch}`, so send only the fields you're changing (`put(id, { completed: true })`). `remove` and `put` return `Promise<void>`. The `*Confirmed` variants resolve only after the server has acknowledged the write; the plain ones return immediately after the optimistic local apply.
- `useUsers()` — `{ users, usersLoaded, setRole(userId, role), refresh() }`. `setRole` is the admin-only mutation for role changes; `refresh()` re-requests the user list from the room.
- `useUserLookup()` — `{ users, usersLoaded, userMap, getUser(id), getEmail(id), getName(id) }`. O(1) wrapper around `useUsers()` for resolving a userId from the wire (e.g., a `MessageRecord.AuthorId`) to display fields without scanning the full users array each render. **Only `getUser` / `getEmail` / `getName` exist** — there is no `getRole` or `getImageUrl`. For role: `getUser(id)?.role`. For avatar: `getUser(id)?.imageUrl` (or whatever your users-collection field is named).
- `useRecordContext()` — low-level store access.

**Classes**
- `RecordStore` — the in-memory store (usually consumed via hooks).

### Messaging (channel-based)

Requires channels + messages schemas in the room. Every hook returns its records array (`channels` / `messages` / `reactions` / `members` / `receipts`) plus `status: 'loading' | 'ready' | 'error'` and `error?: string` — gate skeleton states on `status`.

- `useChannels()` — `{ channels, status, error, create, archive, update, remove }`. `create({ name, type, description? })` makes a new channel — **`type` is required** (`'public' | 'private' | 'dm'`); passing a bare string returns a channel with `name=undefined` / `type=undefined` and silently breaks downstream queries. `archive(channelId)` hides without deleting; `update(channelId, patch)` edits metadata; `remove(channelId)` deletes.
- `useMessages(channelId, options?)` — `{ messages, status, error, send, edit, remove, softDelete }`. `softDelete` flips a tombstone flag instead of hard-deleting (preferred for chat history continuity); `remove` is the hard delete.
- `useReactions(channelId)` — `{ reactions, status, error, getReactionsForMessage, toggle }`. `getReactionsForMessage(messageId)` is an O(1) lookup; `toggle(messageId, emoji)` adds or removes the caller's reaction.
- `useChannelMembers(channelId)` — `{ members, status, error, join, leave, isMember }`.
- `useReadReceipts()` — `{ receipts, status, error, markAsRead, getUnreadCount }`.

**Record types**: `Channel`, `Message`, `Reaction`, `ChannelMember`, `ChannelInvitation`, `ReadReceipt`. Use `ChannelInvitation` together with `CHANNEL_INVITATIONS_SCHEMA` (under "Schema constants" below) when adding invite-only channel flows.
- `useConversation(options?)` — for **DM/conversation DOs** (scope `conv:<id>`) backed by the `conv_messages` / `conv_reactions` / `conv_members` collections. Returns a single `ConversationObject` with `{ messages, reactions, members, status, send, edit, remove, toggleReaction }`. `status` is `'connecting' | 'connected'`. **Different from `useMessages` / `useReactions` / `useChannelMembers`**, which target the channel-style collections (`messages` / `reactions` / `channel_members`). Use `useConversation` only when mounted inside a `RecordScope` for a `conv:<id>` DO; use the channel hooks for `app:<APP_NAME>` channels.

**Helpers**
- `groupReactionsForMessage(reactions, messageId, currentUserId)`
- `shouldGroupMessages(current, previous, options?)`
- `getThreadCounts(messages)`
- `formatMessageTime(dateStr)` / `formatFullTimestamp(dateStr)`
- `getConversationDisplayName(conv)` / `getConversationParticipantIds(conv)`
- `isDMConversation(type)`
- `parseMessageMetadata(raw)`

### Directory (cross-app, shared scope)

Backed by the `dir:<appId>` global DO. Each hook returns its records array plus `ready: boolean`.

- `useConversations()` — `{ conversations, ready, createChannel, createDM, createGroupDM, lookupByName, updateLastMessage, readStateMap, readMessageCountMap, starredSet, archivedSet, getConversationState, upsertState, markRead, toggleStar, setArchived, setTrashed, setLabels, setFolder }`. The full inbox surface — channel/DM creation, per-user read state, star/archive/trash/label/folder mutations.
- `useCommunities()` — `{ communities, memberships, ready, myMemberships, createCommunity, updateCommunity, joinCommunity, leaveCommunity, getMembersOf, lookupByName }`. `myMemberships` is the caller's joined-communities subset.
- `usePosts(opts?: { communityId? })` — `{ posts, ready, createPost, updatePost, deletePost, setConversationId }`. `setConversationId(postId, conversationId)` links a post to a conversation thread (e.g., for comments).

### Real-time collab (Yjs-based)

- `useYjsField(collection, recordId, fieldName)` — collaborative rich data in a field.
- `useYjsText(collection, recordId, fieldName)` — collaborative text input (for textareas / contenteditable).
- `useYjsRoom(docId, fieldName)` — standalone collab doc, not tied to a record. Returns `{ doc, awareness, text, setText, synced, canWrite }` — `synced` flips true once the initial Yjs handshake completes (not "connected" — the socket may be open without sync being done), `canWrite` is the RBAC gate (use it to disable the input until writes are allowed), and `text` / `setText` are convenience accessors for the named `Y.Text` field (`setText` replaces full content). `awareness: Awareness` is the y-protocols awareness instance, already wired to the same WebSocket so local `awareness.setLocalStateField(...)` calls (cursor position, current selection, "is typing") are broadcast to other peers and remote states show up in `awareness.getStates()`. The `docs` feature's Tiptap toolbar uses this for live remote cursors — see its `useDocEditor` for a worked example. For the raw protocol constants (`MSG_AWARENESS`, `encodeAwarenessMessage`, etc.), see "Sync primitives" below.
- `useCanvas(roomId)` — connects to a `CanvasRoom` DO. Returns `{ shapes, viewports, connected, canWrite, addShape, moveShape, resizeShape, deleteShape, updateShape, setViewport, undo, redo }`. `canWrite` is the RBAC gate — defaults false until the server AUTH frame lands, and every write callback **silently no-ops when false** (use it to disable shape/draw controls for viewers). `setViewport` is exempt — viewport broadcasts stay open for viewers since they're presence-like. Shape and viewport types are `CanvasShapeClient` and `ViewportClient`.
- `usePresence(options?)` — **online/offline derivation, NOT cursor presence.** Reads `lastSeenAt` from the users collection in the current `RecordScope`, sends a heartbeat every 60s so the server refreshes the caller's `lastSeenAt`, and returns `{ isOnline, getLastSeen, users }`. `isOnline(userId)` is `true` if the user heartbeated within `options.timeoutMs` (default 5 minutes). For cursor / typing / viewport state, use `usePresenceRoom` instead.
- `usePresenceRoom(scopeId)` — **the cursor / typing / viewport hook.** Connects to a dedicated `PresenceRoom` DO at `/ws/presence/:scopeId`. Pass any string (`canvas:${id}`, `thread:${channelId}`, `doc:${docId}`). Returns `{ peers, connected, updateState(state) }`. `updateState` merges, so you can call it for cursor (`{ cursor: { x, y } }`), typing (`{ typing: true }`), viewport, etc. Each peer is `PresencePeerClient` (`{ userId, userName, userEmail, userImageUrl?, joinedAt, state }`). Self is excluded from `peers`.
- `useGameRoom(roomId)` — connects to a `GameRoom` DO at `/ws/game/:roomId`. Returns `{ state, tick, players, running, connected, canWrite, sendInput(action, data?), setReady(), startGame(), endGame() }`. `canWrite` is the RBAC gate — defaults false until the server AUTH frame lands, and `sendInput` / `setReady` / `startGame` / `endGame` **silently no-op when false** (use it to disable lobby + input UI for spectators). Each player is `{ userId, userName, ready, connectedAt, data }`. State migration on schema bumps lives in the worker — override `onHydrateState(stored)` on the DO subclass.
- `useCronMonitor(roomId)` — admin/monitor stream for the `AppCronRoom` DO. Pass `app:<APP_NAME>` for the app's default cron room. Returns `{ tasks, history, connected, canWrite, trigger(name), pause(name), resume(name) }`. Each task is `{ name, intervalMinutes, schedule, timezone, paused, lastRunAt, nextRunAt }`. `trigger(name)` fires `onTask(name)` immediately on the DO — same path as the alarm scheduler — so a "Run now" button is the right way to E2E-test cron without waiting for the schedule. `canWrite` defaults false until the server AUTH frame lands, and `trigger` / `pause` / `resume` **silently no-op when false**. **The DO enforces the role passed by the wsRoute resolver** — the scaffolded `/ws/cron/:roomId` passes `role: 'member'` for any signed-in connection (anonymous = viewer = `canWrite: false`), so by default any signed-in user can fire owner-billed tasks. For owner-only access, replace the wsRoute helper with an inline handler that resolves role from app state (e.g., only return `role: 'member'` when the JWT subject matches `OWNER_USER_ID`). For finer client-side gating, also disable the controls by `useUser().user?.role === 'admin'` (note `user?.role`, not `role` — `useUser()` returns `{ user, isLoading, refetch }`, fields are nested).
- `useJobs(roomId)` — enqueue + track durable background jobs against the `AppJobRoom` DO. Pass `app:<APP_NAME>` for the app's default job room. Returns `{ jobs, connected, enqueue(type, payload?, opts?), getJob(id), cancel(id), retry(id) }`. `enqueue` returns `Promise<jobId>` (resolves once the server acks, rejects after 10s if no ack). Each job is `JobView` (`{ id, type, status: 'queued'|'running'|'succeeded'|'failed'|'canceled', payload?, result?, error?, progress?, progressMessage?, attempts, maxAttempts, enqueuedAt, startedAt?, completedAt?, enqueuedBy? }`). The DO pushes a snapshot on connect plus a `JOB_UPDATE` for every state change — no polling. **Worker-side enqueue** (HTTP routes, cron, server actions) goes through the `enqueueJob(env.JOB_ROOMS, ...)` helper instead, since those run in a different isolate from the DO. See `references/jobs.md` for the scaffold pattern.

> Audio/video rooms have no SDK hook. Use the `livekit/*` endpoints (`create-room`, `generate-token`, `list-rooms`, `delete-room`) via `integration.post(...)` — see `references/integrations.md`.

#### Worked examples

**Collaborative text input** — bind a `<textarea>` to a Yjs text field and multiple users editing the same record see each other's keystrokes live:

```tsx
import { useYjsText } from 'deepspace'

function DocEditor({ docId }: { docId: string }) {
  const { text, setText, synced, canWrite } = useYjsText('docs', docId, 'body')
  return (
    <textarea
      value={text}
      onChange={e => setText(e.target.value)}
      disabled={!synced || !canWrite}
    />
  )
}
```

`useYjsText` returns `{ text, setText, synced, canWrite }` — there is no `loading`. Gate the input on `!synced || !canWrite` instead.

**Online / offline** — derived from `lastSeenAt` heartbeats:

```tsx
import { usePresence } from 'deepspace'

function OnlineList() {
  const { users, isOnline, getLastSeen } = usePresence()
  return users.map(u => (
    <div key={u.id}>
      <span>{u.name}</span>
      <span>{isOnline(u.id) ? '🟢 online' : `⚪ last seen ${getLastSeen(u.id)}`}</span>
    </div>
  ))
}
```

**Cursors / typing / viewport** — use `usePresenceRoom`, scoped to the surface you care about:

```tsx
import { usePresenceRoom } from 'deepspace'

function CursorOverlay({ canvasId }: { canvasId: string }) {
  const { peers, updateState } = usePresenceRoom(`canvas:${canvasId}`)
  return (
    <div onMouseMove={e => updateState({ cursor: { x: e.clientX, y: e.clientY } })}>
      {peers.map(p => {
        const cursor = p.state.cursor as { x: number; y: number } | undefined
        if (!cursor) return null
        return (
          <div key={p.userId} style={{ position: 'absolute', left: cursor.x, top: cursor.y }}>
            {p.userName}
          </div>
        )
      })}
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

### Wire protocol (custom hooks against DeepSpace DOs)

Re-exported from both `deepspace` and `deepspace/worker` so a custom client hook and a custom DO server-side handler speak the same typed vocabulary. Reach for these only when building something the built-in hooks (`useQuery`, `useMutations`, `useMessages`, etc.) don't cover — most apps never touch this surface.

- `MSG` — frozen object of message-type constants for the WebSocket protocol.
- `ClientMessage` / `ServerMessage` — discriminated unions of every legal message in either direction.
- `clientBuild(...)` — typed builders for outbound messages.
- `dispatch(msg, handlers)` — exhaustive switch on `ServerMessage` for client-side reducers.
- `encode(msg)` — serialize for `WebSocket.send`.

### Files (R2)

- `useR2Files(options?)` — `{ upload, uploadBase64, deleteFile, downloadFile, readFile, list, getUrl, isUploading }`. `list` is an async function that returns the current files; call it (and store the result in state) rather than reading a `files` array directly. Options: `R2Scope` to scope by room/user.
- `isImageFile(mimeType)` / `formatFileSize(bytes)` — display helpers.

```tsx
import { useEffect, useState } from 'react'
import { useR2Files, formatFileSize } from 'deepspace'
import type { R2FileInfo } from 'deepspace'

function Gallery() {
  const { upload, deleteFile, list, getUrl } = useR2Files()
  const [files, setFiles] = useState<R2FileInfo[]>([])

  async function refresh() {
    setFiles(await list())
  }

  useEffect(() => { refresh() }, [])

  async function onDrop(file: File) {
    await upload(file)
    await refresh()
  }

  return files.map(f => (
    <div key={f.key}>
      <img src={getUrl(f.key)} referrerPolicy="no-referrer" />
      <span>{f.originalName ?? f.key} ({formatFileSize(f.size)})</span>
      <button onClick={async () => { await deleteFile(f.key); await refresh() }}>Delete</button>
    </div>
  ))
}
```

> `R2FileInfo` exposes `{ key, size, uploaded, url, originalName?, uploadedBy? }` — there is no `mimeType` / `contentType` field, so `isImageFile(f.mimeType)` won't work directly off a listed file. Either branch on extension (`f.key.endsWith('.png')`), capture the mime type at upload time and store it alongside the key in your own collection, or use `getUrl(f.key)` and let the browser handle non-images. Confirm fields in `node_modules/deepspace/dist/index.d.ts` before relying on additional ones.

> ⚠️ **Local-dev caveat**: R2 upload round-trips require `APP_IDENTITY_TOKEN`, a secret minted by the deploy worker. The CLI now writes it into `.dev.vars` on `dev` / `test` runs, **but only after the app has been registered by at least one `npx deepspace deploy`** — on a fresh scaffold the token is simply absent and uploads return 401 from the platform worker. After the first deploy, re-run `npx deepspace dev` so the CLI fetches the token; subsequent runs are fully working locally. The same `APP_IDENTITY_TOKEN` gate applies to `useSubscription`, `useCheckout`, and `captureScreenshot` — three different paths (R2 → `/api/files/*` → platform-worker `/internal/files/*`; subscriptions/charges → `/_deepspace/*` → api-worker; screenshot → server-side `platformWorkerFetch('/internal/screenshot')`), one shared bearer.

### Platform / Integrations

- `integration` — `{ get / post / put / delete (endpoint, data?, options?) }`. `options` is `{ headers?, timeoutMs?, signal? }` (default timeout 120s). Returns `Promise<IntegrationResponse<T>>` — the envelope is `{ success: true, data } | { success: false, error, issues? }`. `issues` (when present) is an array of `{ path?, message, code? }` returned by the api-worker's Zod validator on a body-shape mismatch — read it instead of guessing field names. See `references/integrations.md` for endpoint list and the `requiresOAuth` retry shape.
- `useAsyncResource<T>(fetcher, deps, options?)` — client hook for external/API resources. `fetcher` receives an `AbortSignal` and returns `Promise<T>`. Options: `{ enabled?, initialData?, keepPreviousData?, retry?, retryDelayMs?, slowAfterMs? }` where `retry` defaults to `0`. Result: `{ status, data, error, isRefreshing, isSlow, retryCount, reload }`.
- `usePagedResource<TItem>(fetchPage, deps, options?)` — client hook for API-backed feeds/search/timelines/infinite scroll. `fetchPage` receives `{ page, pageSize, signal }` and returns `{ items, hasMore? }`. Options: `{ enabled?, initialItems?, pageSize?, maxItemsPerPage?, keepPreviousData?, autoRetryOnError?, retryDelayMs?, maxRetryDelayMs? }`. Result: `{ items, status, error, warning, hasMore, isLoadingInitial, isLoadingMore, isRefreshing, loadMore, retry, refresh }`.
- Re-exported types: `IntegrationResponse`, `RequestOptions`.

**Cross-app platform context (opt-in, not in the scaffold by default).** The platform exports below let an app subscribe to its cross-app inbox (DMs / notifications routed through the platform-worker). They require `<PlatformProvider>` to be mounted somewhere above the consumers — the scaffolded `_app.tsx` does **not** include it, so wrap the tree manually if you need this surface:

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

- `ROLES` — `{ VIEWER: 'viewer', MEMBER: 'member', ADMIN: 'admin' }`. The three role identifiers used in collection `permissions` blocks.
- `ROLE_CONFIG` — display metadata for each role (`{ title, badgeVariant, description }`), used by the scaffold's role-badge UI. **Not RBAC defaults** — actual permissions live in each `CollectionSchema['permissions']`.
- `Role` — the union type `'viewer' | 'member' | 'admin'`.

---

## Worker (`deepspace/worker`)

### Base classes

The scaffold declares five DO classes in `__DO_MANIFEST__` and extends these bases in `worker.ts` — do not add a new DO class without updating the manifest and wrangler migrations.

- `BaseRoom` — abstract parent of all DOs below. Subclass when none of the specialized rooms fit (rare). Provides the WebSocket plumbing, identity parsing from JWT-verified URL params, and connection lifecycle. (JWT verification itself happens upstream in the worker's `wsRoute` before the request reaches the DO; BaseRoom reads `userId` / `userName` / `userEmail` / `userImageUrl` / `role` from `searchParams`.) Type: `UserAttachment` for authenticated socket attachments.
- `RecordRoom` — primary app data DO. Extend with your `schemas`. Configurable via `RecordRoomConfig` (the second-arg shape in the constructor below):
  ```typescript
  export class AppRecordRoom extends RecordRoom<Env> {
    constructor(state: DurableObjectState, env: Env) {
      super(state, env, schemas, { ownerUserId: env.OWNER_USER_ID })
    }
  }
  ```
  All room base classes accept a `<E = Record<string, unknown>>` generic for env typing — the scaffold uses `RecordRoom<Env>` / `YjsRoom<Env>` / `CanvasRoom<Env>` / `PresenceRoom<Env>` / `CronRoom<Env>` / `JobRoom<Env>` so `this.env.<binding>` is typed inside overrides. The unparameterized form still works (defaults to loose record) — useful for SDK-shipped DOs.
- `YjsRoom` — per-doc collaborative text (Y.Text) and rich fields.
- `CanvasRoom` — collaborative canvas state (shapes, strokes). Types: `CanvasShape`, `Viewport`.
- `PresenceRoom` — cursors, typing indicators, "who's online". Type: `PresencePeer`.
- `CronRoom` — scheduled-task DO. Construct with `CronRoomConfig` (`{ tasks: CronTask[] }`) and override `onTask(name)`. Types: `CronTask`, `CronExecution`. See `references/cron.md` for the scaffold pattern.
- `JobRoom` — durable background-job queue DO. Construct with optional `JobRoomConfig` and override `onJob(job, ctx)`. Handler returns the result (captured as `job.result`) or throws to fail; `ctx` exposes `progress(0..1, msg?)`, `continue(state, { afterMs? })` (resume on next alarm for >15-min jobs), and `signal: AbortSignal` (fires on client cancel). Cross-isolate enqueue via the exported `enqueueJob(namespace, roomId, type, payload, opts?)` helper. Types: `Job`, `JobContext`, `JobStatus`, `JobRoomConfig`. See `references/jobs.md` for the scaffold pattern.
- `GameRoom` — turn-tick / sim-tick game-loop DO. Configurable via `GameRoomConfig`. Types: `Player`, `GameInput`. State migration via `onHydrateState(stored)` — see "Game rooms (state migration)" below.

Each has its own WebSocket route wired in `worker.ts` (`/ws/yjs/:docId`, `/ws/canvas/:docId`, `/ws/presence/:scopeId`, `/ws/cron/:roomId`, `/ws/jobs/:roomId`, `/ws/game/:roomId`).

> No `MediaRoom` — LiveKit replaces it. Use `livekit/*` integration endpoints (see `references/integrations.md`).

### DO manifest

- `DOManifest` / `DOManifestEntry` — typed shape of `__DO_MANIFEST__` (the `as const satisfies DOManifest` literal in scaffolded `worker.ts`).
- `DOBindings<typeof __DO_MANIFEST__>` — derives the `Env` interface's DO bindings from the manifest at compile time. The scaffold's `Env extends DOBindings<typeof __DO_MANIFEST__>` is what makes `env.RECORD_ROOMS`, `env.YJS_ROOMS`, etc. typed correctly.
- `DEFAULT_DO_MANIFEST` — fallback manifest with **only two** entries (`RECORD_ROOMS` + `YJS_ROOMS`), used when an app doesn't export `__DO_MANIFEST__`. **Not** the scaffold's manifest — the scaffold's `worker.ts` declares its own 5-class set (`AppRecordRoom`, `AppYjsRoom`, `AppCanvasRoom`, `AppPresenceRoom`, `AppCronRoom`). Useful when programmatically building a manifest from scratch.

### Game rooms (state migration)

Subclasses of `GameRoom` can override `onHydrateState(stored)` to migrate persisted game state when redeploying with a schema change. Use it for:

- **Evolving schemas** — merge new fields into existing stored state.
- **Version bumps** — transform old shapes to new ones.
- **Fresh starts** — discard stale blobs and return a default state.

Omit the override to keep the legacy behavior (load the stored blob as-is).

### Auth
- `verifyJwt(config, token)` — `config: JwtVerifierConfig` (`{ publicKey, issuer, audience, authorizedParties?, clockSkewMs? }`), `token: string | null | undefined`. Returns `Promise<VerifyOutcome>` — a `{ result: VerifyResult | null, error? }` envelope; **does not throw** on invalid tokens. Extract the JWT from the request yourself (e.g., `Authorization: Bearer <token>` or session cookie) before calling.
- `decodeJwtPayload(token)` — base64url-decode the JWT payload **without verification**. Useful for inspecting `sub` / `email` / `name` for logging or routing where verification has already happened upstream. Never use as a substitute for `verifyJwt` on the trust boundary.
- `createDeepSpaceAuth(config)` — constructs a Better Auth instance pre-wired for DeepSpace conventions (cookie names, JWT issuance). Types: `DeepSpaceAuth`, `DeepSpaceAuthConfig`. The scaffold doesn't build its own auth surface — it proxies to the platform auth-worker — so you only reach for this when standing up a custom auth-worker variant.

### AI provider helper
- `createDeepSpaceAI(env, provider, options?)` — returns a Vercel-AI-SDK-compatible provider routed through the DeepSpace API worker. `provider` is `'anthropic' | 'openai' | 'cerebras'`. Pass `{ authToken }` for user-billed calls (inside a request handler); omit for server-side autonomous calls (falls back to `env.APP_OWNER_JWT`, billed to the app owner). Types: `DeepSpaceAIEnv`, `DeepSpaceAIOptions`.

### AI chat — context compaction & history
- `prepareMessagesWithCompaction(messages, config, { summarizer, cachedSummary? })` — pre-stream pipeline. Truncates old tool results, applies cached summary if given, summarizes the older half if still over budget, falls back to sliding window on summarizer error. Returns `{ messages, newSummary? }`.
- `truncateOldToolResults(messages, keepRecent)` — replace old tool-result payloads with a small marker; preserves errors (`success: false`) and the `keepRecent` most recent assistant turns intact.
- `applySlidingWindow(messages, charCap, minKept)` — drop oldest messages until under `charCap`, never below `minKept`. System messages are pinned.
- `capToolResultSize(result, byteCap)` — cap individual tool-result payloads with a structured "result too large; narrow your query" error (preserves a 2KB preview).
- `totalChars(messages)` — sum of `content` + `JSON.stringify(parts)` lengths.
- `turnsToCoreMessages(turns: ChatTurn[]) → ModelMessage[]` — convert persisted UI-shape ChatTurns into Vercel AI SDK v5 ModelMessages, splitting assistant rows at each tool-call boundary so Anthropic's `tool_use → tool_result` pairing is satisfied.
- `buildUiParts(responseMessages: ModelMessage[]) → unknown[]` — inverse of `turnsToCoreMessages`. Convert the AI SDK's `onFinish` response into the flat UI-shape `parts` array we persist on `ai-messages` rows.
- `unwrapToolOutput(output)` — unwrap v5's tagged `output` (`{ type: 'json' | 'text' | 'error-text' | 'error-json', value }`) into the flat shape we persist; errors get remapped to `{ success: false, error }`.
- `makeDefaultSummarizer(env, { authToken? })` — Claude-Haiku-backed `Summarizer`. Omit `authToken` to bill the owner; pass the caller's JWT to bill the user.
- `DEFAULT_CONTEXT_CONFIG` — `{ contextBudget: 240_000, toolResultCap: 30_000, keepRecentToolResults: 5, minKept: 10 }`. Sized for 200K+ context models.
- Types: `ChatContextConfig`, `ChatTurn`, `Summarizer`.

### AI chat — history persistence (`'deepspace/worker'`)
Wrappers around the DO tools API that read/write the `ai-chats` and `ai-messages` collections with `X-App-Action: 'true'` (bypass user RBAC). The worker is the trust boundary — callers MUST verify chat ownership before invoking write helpers (`updateChat`, `appendMessage`, `deleteChatCascade`); the scaffold's chat routes do this via a `getChat` precheck.

- `getChat(stub, chatId, userId) → Promise<ChatRow | null>` — load one chat row (returns `null` on missing or cross-user).
- `createChat(stub, userId, { title?, model? })` → `Promise<ChatRow>`.
- `updateChat(stub, chatId, userId, patch)` — patch `{ title?, model?, compactedSummary?, compactedThroughId? }`.
- `deleteChatCascade(stub, chatId, userId)` — delete all `ai-messages` rows where `chatId` matches, then the `ai-chats` row. Best-effort: throws aggregated error if any delete fails.
- `loadMessages(stub, chatId, userId) → Promise<ChatMessageRow[]>` — chronologically ordered messages for one chat, filtered by `userId` (defense in depth).
- `appendMessage(stub, { id, chatId, userId, role, content, parts? })` — write one row.
- Types: `ChatRow` (`{ recordId, id (@deprecated alias for recordId), userId, title, model?, compactedSummary?, compactedThroughId?, createdAt, updatedAt }`), `ChatMessageRow` (`{ recordId, id (@deprecated alias for recordId), chatId, userId, role, content, parts?, createdAt }`). **Use `recordId`**, not `id` — `id` is kept only for backward compatibility and may be removed in a future version. Reading `chat.id` and sending `{ chatId: chat.id }` happens to work today, but `chat.recordId` is the canonical field across the rest of the SDK and won't silently `undefined` if `id` is dropped.

### AI chat — schemas
- `AI_CHATS_SCHEMA` — pre-built schema for the `ai-chats` collection. RBAC: members `read/update/delete: 'own'`, `create: false` (writes only via the worker). Drop into `src/schemas.ts` to enable AI chat persistence.
- `AI_MESSAGES_SCHEMA` — pre-built schema for the `ai-messages` collection. Same RBAC posture. The `parts` column is JSON-typed (UI-shape tool invocations).

### AI chat — frontend wire helpers (`'deepspace'`)
Pure decoders for the Vercel AI SDK v5 `toUIMessageStreamResponse` SSE body. Use these to build a custom chat surface without taking the React `ChatPanel` from the `ai-chat` feature.

- `parseSseLine(line: string) → AiStreamChunk | null` — strip SSE framing on one line. Returns the parsed JSON payload, or `null` for blank lines / comments / `[DONE]`.
- `decodeAiStreamChunk(chunk: AiStreamChunk) → AiStreamAction | null` — decode one v5 UIMessage stream chunk into a small action vocabulary (`append-text`, `upsert-tool-call`, `finalize-tool-call`, `fail-tool-input`, `fail-tool-output`, `stream-error`, `abort`). Lifecycle markers and unsupported chunks return `null`.
- Types: `AiStreamAction`, `AiStreamChunk`.

### Server action types
- `ActionHandler<TEnv = Record<string, unknown>>` — `(ctx: ActionContext<TEnv>) => Promise<ActionResult>`. The `TEnv` generic lets you type the worker's `env` bindings — the scaffold uses `ActionHandler<Env>` so `ctx.env.<binding>` is typed inside handlers. Defaults to a loose record so unparameterized handlers compile.
- `ActionContext<TEnv>` — `{ userId, params, tools, env }`. `userId` is the caller (verified JWT subject). `params` is the JSON body. `env` is the worker bindings (use it for owner-only gates: `ctx.userId === ctx.env.OWNER_USER_ID`). `tools` is `ActionTools`.
- `ActionTools` — `{ create<T>, update<T>, remove, get<T>, query<T>, integration<T> }`. Each method is generic over its row shape; results for the record ops are typed per op (`MutateActionData` / `GetActionData<T>` / `QueryActionData<T>`). `tools.integration<T>(endpoint, data?)` is the odd one out — it returns `Promise<ActionResult<T>>` where `T` is the integration's raw response body, **with no envelope wrapper**. All bypass caller RBAC — the `X-App-Action` header marks the call as the app itself. All five `tools.*` ops are RBAC-bypassing, including `tools.query` (parity fixed in 0.3.x; earlier SDKs filtered query results by caller permissions).
- `ActionResult<TData = unknown>` — discriminated union: `{ success: true; data: TData; error?: never } | { success: false; data?: never; error: string }`. Narrow with `if (result.success) { result.data … }` — TS narrows `data` to the per-op shape (`{ records, count }` for query, `{ record }` for get, `{ recordId }` for mutations). For `tools.integration`, `result.data` **is the integration body directly** — an OpenAI call yields `result.data.choices`, a Freepik image call yields `result.data.images`, etc. There is no `.response` / `.status` wrapper.

### AI tool helpers (from `deepspace/worker`)
- `BUILT_IN_TOOLS` — catalog of read-only tool definitions.
- `ToolSchema` — tool-definition type.
- See `src/ai/tools.ts` in the scaffold for `buildSystemPrompt(appName, schemas)` and `buildReadOnlyTools(executor)` — both are app-local by default (the scaffold ships a reference implementation you can edit to add custom tools).

### R2 helpers
- `createScopedR2Handler(...)` — route handler for scoped R2 reads/writes.

### Custom bindings & metering (from `deepspace/worker`)

Load `references/bindings.md` for the full picture; signature reference below.

- `runMigrations(db: D1Database, migrations: readonly string[]) → Promise<{ fromVersion, toVersion, applied }>` — bootstrap auto-provisioned D1. Each migration string can hold multiple `;`-separated statements; **no `;` inside string literals** (the split is naive). Tracks state in a `_dpc_migrations(idx INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)` meta-table. Idempotent — safe at worker startup. Append new migrations to the end of the array; never reorder or delete.
- `meterAi(env, model: string, fields: { inputChars?, outputChars?, calls? }) → boolean` — emits `op='input'` and `op='output'` events to `USAGE_EVENTS`; both 0 → emits `op='call'` so the model invocation is still recorded. Returns `false` when `USAGE_EVENTS` is missing or AnalyticsEngine throws (never breaks the calling path).
- `meterVectorize(env, indexName: string, op: 'query' | 'upsert' | 'delete' | 'getByIds', fields: { vectors?, dims?, storedCount? }) → boolean` — units = `(vectors + storedCount) * dims` for query, `vectors * dims` for the rest (matches CF's `(stored + queries) * dims` formula). Pass `storedCount` on queries against non-empty indexes or you'll significantly undercount.
- `meterUsage(env, kind: string, fields: { id?, op?, units?, count? }) → boolean` — generic fallback for any other binding (Browser Rendering, Hyperdrive, etc.). Writes to `USAGE_EVENTS` keyed by `OWNER_USER_ID`, blob `[APP_NAME, kind, id, op]`, doubles `[units, count]`.
- `COST_RATES` — per-`units` USD multipliers for dashboard rollup (input/output AI tokens, vectorize queried/stored dims).

Binding manifest exports (advanced):
- `AUTO_PROVISION_SENTINEL` (`'auto'`), `AUTO_PROVISIONABLE_TYPES` (`d1`, `kv_namespace`, `vectorize`, `r2_bucket`, `queue`).
- `ALLOWED_BINDING_TYPES` — the 9 declarable types (`vectorize`, `ai`, `r2_bucket`, `kv_namespace`, `d1`, `queue`, `browser_rendering`, `analytics_engine`, `hyperdrive`).
- `RESERVED_BINDING_NAMES` — 11 SDK-owned names apps may not redeclare (`ASSETS`, `PLATFORM_WORKER`, `API_WORKER`, `APP_NAME`, `OWNER_USER_ID`, `AUTH_JWT_PUBLIC_KEY`, `AUTH_JWT_ISSUER`, `AUTH_WORKER_URL`, `APP_IDENTITY_TOKEN`, `APP_OWNER_JWT`, `USAGE_EVENTS`).
- `validateBindingManifest(manifest) → ValidationError[]`, `isAutoProvision(b)`, `bindingManifestFromOutputConfig(config)` — utilities used by the CLI and deploy worker.
- `CustomBinding` type union — the wire shape over which the manifest is validated.

### Upstream worker proxy helpers

The scaffolded `worker.ts` already uses these for every cross-worker call (auth proxy, integration proxy, file proxy, AI helper) — you rarely need to call them directly, but you do need to keep them when editing `worker.ts` so the same code works in dev and prod.

- `apiWorkerFetch(env, path, init?)` — fetch the api-worker. Prefers the `API_WORKER` service binding; falls back to `API_WORKER_URL`.
- `platformWorkerFetch(env, pathOrRequest, init?)` — fetch the platform-worker. Accepts either a path string or a full `Request` (so you can hand off `c.req.raw` derivatives with method/headers/body intact). Prefers `PLATFORM_WORKER` binding; falls back to `PLATFORM_WORKER_URL`.
- `authWorkerFetch(env, path, init?)` — fetch the auth-worker. URL-only by design (`AUTH_WORKER_URL`); the auth-worker has no service binding so `Set-Cookie` headers stay verbatim over plain HTTPS.
- Env interface types: `ApiWorkerEnv`, `PlatformWorkerEnv`, `AuthWorkerEnv`. Extend the app's `Env` from these (the starter does).
- Each helper throws an actionable Error if neither transport is configured. **Do not** replace these with raw `c.env.X.fetch(...)` — `wrangler dev` doesn't surface service bindings cross-process for SDK apps, so the binding is `undefined` locally and the fetch silently fails. The helpers paper over the dev/prod mismatch.

Production note: cross-worker calls over plain `*.workers.dev` URLs return Cloudflare error 1042 in production. The service binding is the only working transport for deployed apps; the URL fallback is a dev-only convenience the CLI writes into `.dev.vars`. If a deployed app needs `apiWorkerFetch` / `platformWorkerFetch`, the corresponding `[[services]]` binding must be in `wrangler.toml`.

### Schema constants (drop-in collections)

**Users / messaging**
- `USERS_COLUMNS` — standard users columns.
- `BASE_USERS_SCHEMA` — the canonical `users` collection assembled from `USERS_COLUMNS`; the scaffold's `usersSchema` extends this. Don't replace; extend.
- `CHANNELS_SCHEMA` / `MESSAGES_SCHEMA` / `REACTIONS_SCHEMA` / `CHANNEL_MEMBERS_SCHEMA` / `CHANNEL_INVITATIONS_SCHEMA` / `READ_RECEIPTS_SCHEMA` — the channel-style messaging collections. Drop into your app's `schemas` array to enable `useChannels` / `useMessages` / `useReactions` / `useChannelMembers` / `useReadReceipts`.
- `SYSTEM_COLLECTIONS` — set of reserved collection names used internally by the SDK (Yjs state, system metadata). Avoid naming user collections that collide.

**Conversation / DM scopes** (`conv:<id>` DOs)
- `CONVERSATION_SCHEMAS` — array of the `conv_messages` / `conv_reactions` / `conv_members` / `conv_read_cursors` collections. Pass as the `schemas` of a conversation-scope `RecordRoom` to enable `useConversation`.

**Directory** (`dir:<appId>` shared DO — cross-app)
- `DIRECTORY_SCHEMAS` — array of 5 collections: `conversations`, `conversation_state`, `communities`, `memberships`, `posts`. Passed by the platform's directory DO; rarely instantiated by an app directly. There is no `community_members` (use `memberships`) and no `comments` collection.
- `VOTING_SCHEMAS` — voting / poll collections used by directory features.

**Workspace** (cross-app shared scope)
- `WORKSPACE_SCHEMAS` — shared-scope collections (email handles, teams, etc.) — pass as `schemas` to a `workspace:default` shared scope to let apps read cross-app user identity (e.g., a user's claimed `@app.space` email handle). Handles are managed by the mail app; other apps query via `useQuery('email_handles', { where: { UserId: user?.id } })` to resolve a user's address for outbound email.
- `workspaceTeamsSchema` — the `teams` collection inside `WORKSPACE_SCHEMAS`. Exported separately so an app can reference its column names without pulling the whole array.

**Global DO type registry**
- `GLOBAL_DO_TYPES` / `GLOBAL_DO_TYPE_NAMES` — array of registered global DO types (workspace, dir, conv, …) and their reserved schema names.
- `getGlobalDOType(name)` / `getGlobalDOSchemas(typeName)` — runtime lookups for what schemas a given global DO scope expects.
- `RESERVED_COLLECTION_NAMES` — set of collection names you cannot use in app-defined schemas because they're owned by global DOs.

---

## Platform-backed server helpers (`deepspace/server`)

Worker-side helpers that call into shared platform services (Browser Rendering, Stripe, refund ledger) on the app's behalf, signing with the per-app `APP_IDENTITY_TOKEN`. They live in their own entry point so apps that don't need them avoid pulling the dependencies. All require `Env` to include `APP_IDENTITY_TOKEN: string` and `APP_NAME: string`. Subscriptions and refunds extend `ApiWorkerEnv`; `captureScreenshot` extends `PlatformWorkerEnv`.

### Screenshots (shared Browser Rendering)
- `captureScreenshot(env, { url, viewport?, waitUntil?, timeoutMs?, fullPage? }) → Promise<{ body: ArrayBuffer; contentType: 'image/png' } | null>` — renders a URL via the platform's shared Browser Rendering binding. Returns `null` on any non-2xx (rate limit, allowlist miss, timeout) so the worker can fall back to a placeholder. The platform enforces a host allowlist (`*.app.space` / `*.deep.space`), per-app sliding rate limits, and viewport / timeout clamping. **Apps no longer need their own `browser_rendering` binding for standard preview / OG-image flows** — only add one if you need an unmetered or differently-configured browser (e.g., custom user agents, third-party hosts).

### Subscriptions & charges (payments)
- `requireSubscription(c, { tier? | atLeast? })` — gate route; throws `SubscriptionRequiredError` if the caller's tier doesn't match. See `references/payments.md`.
- `getSubscription(c)`, `cancelSubscription(c, opts)`, `refundInvoice(c, opts)` — server-side admin/cancel/refund helpers. `cancelSubscription` returns `{ success, canceled, failures, atPeriodEnd, hasMore }` and batches at 50 — loop while `hasMore === true` to cancel every matching subscription (the underlying `cancel_at_period_end` flag is idempotent, so re-flagging is a safe no-op). See `references/payments.md`.
- Error classes: `SubscriptionRequiredError`, `SubscriptionAuthError`, `CancelSubscriptionError`, `RefundError`.

> The `/_deepspace/*` browser proxy in the starter `worker.ts` is what makes the client-side `useSubscription` / `useCheckout` hooks reach these handlers without exposing `APP_IDENTITY_TOKEN` to the browser. Don't strip it from `worker.ts` or `wrangler.toml`'s `run_worker_first`.

---

## Testing (`deepspace/testing`)

Imported only inside Playwright spec files. See `references/testing.md` for the full workflow.

- `test`, `expect` — Playwright re-exports with the `users` fixture pre-installed.
- `users(N | string[])` — fixture that returns N signed-in `MultiplayerUser`s `{ context, page, email, name, userId? }` from `~/.deepspace/test-accounts.json`. Auto-closes contexts at end of test.
- `loadAllTestAccounts()` / `pickTestAccounts(n, opts?)` / `findTestAccountByName(name)` — escape hatches when the fixture is too high-level.
- `ensureStorageState(browser, account, baseURL)` — sign in once, return cached `storageState` path. Reuse via `browser.newContext({ storageState: path })`.
- `newSignedInContext(email, browser)` — one-liner for a signed-in `BrowserContext`.
- `getStatePathForEmail(email)` / `readCachedState(path)` — direct cache access.
- Types: `MultiplayerUser`, `UsersFixture`, `TestAccount`, `EnsureStorageStateOptions`.

---

## Not listed here?

Four places to look:
1. `node_modules/deepspace/dist/index.d.ts` — authoritative type surface for frontend.
2. `node_modules/deepspace/dist/worker.d.ts` — authoritative type surface for worker.
3. `node_modules/deepspace/dist/server.d.ts` — authoritative type surface for the platform-backed server helpers.
4. `node_modules/deepspace/dist/testing.d.ts` — authoritative type surface for the Playwright fixture.

If a hook or type isn't in this reference, it probably exists in `.d.ts`. Read the declaration to get the exact signature. Do not guess.
