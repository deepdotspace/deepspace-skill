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
- `useQuery<T>(collection, options?)` — `{ records, loading, error }`. Options: `where`, `orderBy`, `limit`.
- `useMutations<T>(collection)` — `{ create, put, remove, createConfirmed, putConfirmed, removeConfirmed }`. **`create` returns `Promise<string>`** (the new recordId — capture it for navigation: `const id = await create({...}); navigate(\`/items/${id}\`)`). `put` and `remove` return `Promise<void>`. The `*Confirmed` variants resolve only after the server has acknowledged the write; the plain ones return immediately after the optimistic local apply.
- `useUsers()` — all users in the room.
- `useUserLookup()` — map-style lookup by userId.
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
- `useConversation(options?)` — single-conversation object (for DMs or focused channel views).

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
- `usePresence(options?)` — cursor/user presence in the current scope.
- `usePresenceRoom(scopeId)` — presence for an explicit scope (e.g., a separate doc room).
- `useGameRoom(roomId)` — game-room abstraction.
- `useMediaRoom(roomId)` — LiveKit media room.
- `useCronMonitor(roomId)` — cron job status stream.

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

- `integration` — `{ post(endpoint, params) }`. See `references/integrations.md` for endpoint list.
- `usePlatform()` — platform context (env, URLs, registry).
- `PlatformContext` — raw context (rarely needed).
- `useInbox()` — cross-app inbox entries.
- `usePlatformWS<S>()` — platform WebSocket subscription.

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
- `DEFAULT_USER_COLORS` / `getUserColor(userId, palette?)` — per-user color assignment.

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
- `MediaRoom` — LiveKit-backed audio/video rooms.
- `PresenceRoom` — cursors, typing indicators, "who's online".

Each has its own WebSocket route wired in `worker.ts` (`/ws/yjs/:docId`, `/ws/canvas/:docId`, `/ws/media/:roomId`, `/ws/presence/:scopeId`).

### Game rooms (state migration)

Subclasses of `GameRoom` can override `onHydrateState(stored)` to migrate persisted game state when redeploying with a schema change. Use it for:

- **Evolving schemas** — merge new fields into existing stored state.
- **Version bumps** — transform old shapes to new ones.
- **Fresh starts** — discard stale blobs and return a default state.

Omit the override to keep the legacy behavior (load the stored blob as-is).

### Auth
- `verifyJwt(request, env)` — validates the session JWT, returns `{ userId, ... }` or throws.
- `verifyInternalSignature({ secret, payload, signature, timestamp })` / `buildInternalPayload(body)` — HMAC verification for internal platform → app calls (e.g., the `/internal/cron` endpoint).

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
