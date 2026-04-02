---
name: deepspace
description: Use when working in a project that depends on the `deepspace` npm package, building real-time collaborative apps on Cloudflare Workers, or when the user mentions DeepSpace SDK
---

# DeepSpace SDK

Build real-time collaborative apps on Cloudflare Workers. One npm package, SQLite-backed Durable Objects, RBAC, WebSocket subscriptions, Better Auth.

## Setup

```bash
npm install deepspace          # one package, everything included
npx deepspace create my-app    # scaffold a new app
npx deepspace login             # authenticate
npx deepspace deploy            # deploy to *.app.space
```

Local dev: `pnpm dev` starts all workers + Vite with HMR.

## Two Imports

```typescript
// Frontend (React)
import { RecordProvider, RecordScope, useQuery, useMutations, useAuth } from 'deepspace'

// Worker (Cloudflare Worker)
import { RecordRoom, verifyJwt, CHANNELS_SCHEMA } from 'deepspace/worker'
```

## Architecture

Each app has its own **RecordRoom** Durable Object with schemas baked in at deploy time. The app's `worker.ts` exports `AppRecordRoom` which extends `RecordRoom` with the app's schemas. WebSocket connections go directly to the app's DO — no proxy hop.

Global DOs (conversations, directories, workspaces) live in the platform worker.

```
App Worker (per-app)         Platform Worker (shared)
├── AppRecordRoom DO         ├── GlobalRecordRoom DO
├── /ws/:roomId              ├── /ws/:scopeId (conv, dir, workspace)
├── /api/auth/* → auth-worker├── /api/app-registry
└── Static assets (SPA)      └── /api/health
```

## Schemas (Columns Only)

Every collection uses typed SQL columns. No document-mode / fields-based storage.

```typescript
// src/schemas.ts
import { USERS_COLUMNS, CHANNELS_SCHEMA, MESSAGES_SCHEMA } from 'deepspace/worker'

const itemsSchema = {
  name: 'items',
  columns: [
    { name: 'title', storage: 'text', interpretation: 'plain' },
    { name: 'status', storage: 'text', interpretation: { kind: 'select', options: ['draft', 'published'] } },
    { name: 'createdBy', storage: 'text', interpretation: 'plain' },
  ],
  ownerField: 'createdBy',
  permissions: {
    anonymous: { read: 'published', create: false, update: false, delete: false },
    viewer: { read: true, create: false, update: false, delete: false },
    member: { read: true, create: true, update: 'own', delete: 'own' },
    admin: { read: true, create: true, update: true, delete: true },
  },
  visibilityField: { field: 'status', value: 'published' },
}

export const schemas = [usersSchema, itemsSchema, CHANNELS_SCHEMA, MESSAGES_SCHEMA]
```

## Frontend Hooks

### Core (always available)
```typescript
const { records } = useQuery<Item>('items', { where: { status: 'published' }, orderBy: 'createdAt' })
const { create, put, remove } = useMutations<Item>('items')
const { user } = useUser()          // storage-level: id, name, email, role
const { isSignedIn } = useAuth()    // auth state
const { users } = useUsers()        // all room users
```

### Messaging (channel-based)
```typescript
const { channels, create } = useChannels()
const { messages, send, edit, remove } = useMessages(channelId)
const { getReactionsForMessage, toggle } = useReactions(channelId)
const { isMember, join, leave } = useChannelMembers(channelId)
const { markAsRead, getUnreadCount } = useReadReceipts()
```

### Directory (cross-app)
```typescript
const { conversations, createChannel, createDM } = useConversations()
const { communities, createCommunity, joinCommunity } = useCommunities()
const { posts, createPost } = usePosts()
```

## Provider Stack

```tsx
<DeepSpaceAuthProvider>
  <RecordProvider allowAnonymous>
    <RecordScope
      roomId={SCOPE_ID}
      schemas={schemas}
      appId={APP_NAME}
      sharedScopes={[{ roomId: 'workspace:default', schemas: workspaceSchemas }]}
    >
      <App />
    </RecordScope>
  </RecordProvider>
</DeepSpaceAuthProvider>
```

- `RecordProvider` handles auth context. `allowAnonymous` lets unauthenticated users connect.
- `RecordScope` opens a WebSocket to one RecordRoom DO. `sharedScopes` connects to additional DOs headlessly.
- Auth identity change (sign-in, sign-out) automatically disconnects and reconnects all scopes.

## Auth

Better Auth with cookie-based sessions. JWT (ES256, 5min) for WebSocket auth. User profile derived from JWT claims — no separate API call.

```tsx
// Sign-in via modal (closeable)
<AuthOverlay onClose={() => setShowModal(false)} />

// Conditional rendering
<SignedIn>Only signed-in users see this</SignedIn>
<SignedOut><button onClick={showSignIn}>Sign In</button></SignedOut>
```

## Worker (worker.ts)

```typescript
import { RecordRoom, verifyJwt, createScopedR2Handler } from 'deepspace/worker'
import { schemas } from './src/schemas.js'

export class AppRecordRoom extends RecordRoom {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env, schemas, { ownerUserId: env.OWNER_USER_ID })
  }
}
```

The worker handles: auth proxy, WebSocket → DO routing, server actions, R2 files, cron, static assets.

## Features

Features are reference implementations in `.deepspace/features/`. Each has a `FEATURE.md` with exact copy instructions and wiring steps.

To add a feature: read `.deepspace/features/<name>/FEATURE.md`, copy the source files to the specified destinations, and wire up imports/routes/schemas as instructed.

Available features: landing-page, sidebar-nav, topbar-nav, layout-sidebar, display-kanban, items-crud, admin-page.

## RBAC

Permissions are per-role, per-collection. Permission levels:
- `true` / `false` — allow/deny all
- `'own'` — only records where ownerField matches userId
- `'published'` — owner OR passes visibilityField check
- `'shared'` — owner OR collaborator OR published
- `'team'` — owner OR collaborator OR team member

New authenticated users get `member` role by default. Anonymous connections get `anonymous` role.

## Local Dev

```bash
pnpm dev              # starts auth-worker, api-worker, platform-worker, app worker, Vite
pnpm test:local       # 25 Playwright tests against real local workers
```

All secrets from Doppler: `./scripts/setup-env.sh dev`

App worker uses `wrangler.dev.toml` for local dev (real values, no `__APP_NAME__` placeholder).

## Deploy

```bash
npx deepspace login
npx deepspace deploy
```

Deploys to `{app-name}.app.space` via Workers for Platforms. Schemas baked into the worker bundle at build time.

## Key Rules

- **Schemas are columns only** — no `fields` property, no document-mode
- **No user scope DOs** — user-scoped data lives in app DOs
- **No schema runtime loading** — schemas baked in at deploy time
- **No mux/gateway** — direct WebSocket per scope
- **JWT provides user profile** — no separate `/api/users/me` call
- **All tests use real services** — never mock internal hooks
