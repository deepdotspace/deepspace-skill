# Schemas, RBAC, and data visibility

Load this reference when defining a new collection, choosing a permission rule, debugging "why can't this user see/edit X," or wiring a `visibilityField` / `collaboratorsField`. Skip it for using existing schemas, scaffold-only changes that don't add collections, or pure UI work.

## Defining a collection

Add one file per collection under `src/schemas/` and register it in `src/schemas.ts`. Every collection needs `name`, `columns`, and `permissions`. The scaffold already ships `usersSchema` (in `users-schema.ts`) and `settingsSchema` (in `admin-schema.ts`) — add your own alongside them, never replace them.

```typescript
// src/schemas/items-schema.ts
import type { CollectionSchema } from 'deepspace/worker'

export const itemsSchema: CollectionSchema = {
  name: 'items',
  columns: [
    { name: 'title', storage: 'text', interpretation: 'plain' },
    { name: 'status', storage: 'text', interpretation: { kind: 'select', options: ['draft', 'published'] } },
  ],
  visibilityField: { field: 'status', value: 'published' },
  permissions: {
    viewer: { read: 'published', create: false, update: false, delete: false },
    member: { read: true, create: true, update: 'own', delete: 'own' },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
```

```typescript
// src/schemas.ts
import type { CollectionSchema } from 'deepspace/worker'
import { usersSchema } from './schemas/users-schema'
import { itemsSchema } from './schemas/items-schema'

export const schemas: CollectionSchema[] = [usersSchema, itemsSchema]
```

For messaging, add `CHANNELS_SCHEMA`, `MESSAGES_SCHEMA`, `REACTIONS_SCHEMA` (and optionally `CHANNEL_MEMBERS_SCHEMA`, `CHANNEL_INVITATIONS_SCHEMA`, `READ_RECEIPTS_SCHEMA`) from `deepspace/worker` to the array.

Schemas are columns only — no `fields` property, no document-mode storage.

## Roles

- Built-in roles: `viewer | member | admin` (see `ROLES`).
- New authenticated users get `member` by default (override via `defaultRole` on the users schema).
- For unauthenticated connections use the `'*'` wildcard permission key — there is no built-in `anonymous` role.

```typescript
permissions: {
  '*':    { read: 'published', create: false, update: false, delete: false },
  member: { read: true, create: true, update: 'own', delete: 'own' },
  admin:  { read: true, create: true, update: true, delete: true },
}
```

## Permission rules

Per-role, per-collection. The five values that cover ~95% of apps:

| Rule | Meaning |
|---|---|
| `true` / `false` | Allow / deny all |
| `'own'` | Records where `ownerField` matches userId (falls back to `record.createdBy` from the envelope if `ownerField` is omitted — no extra column needed) |
| `'published'` | Owner OR passes `visibilityField` check |
| `'shared'` | Owner OR collaborator OR published (uses `collaboratorsField` + `visibilityField`) |
| `'team'` | Owner OR collaborator OR team member |

`ownerField` is only required when you use `'own'`/`'shared'`/`'team'` **and** want ownership tied to a column other than the record's creator.

Advanced rules (supported by `PermissionRule` but rarely needed — check `packages/deepspace/src/shared/types/index.ts` `PermissionRule` before using):

- `'unclaimed-or-own'` — record has no owner OR the caller owns it
- `'collaborator'` — caller is the **owner** OR is in `collaboratorsField`. Despite the name, owners always pass.
- `'access'` — caller passes a per-collection access check (currently behaves identically to `'team'`; prefer `'team'` for clarity).

## Data visibility

When creating records scoped to specific users (e.g., conversations, private data):

- For **app-scoped messaging** (`CHANNELS_SCHEMA` + `MESSAGES_SCHEMA` in your app's `RecordRoom`): the channel record's `type` field (`'public' | 'private' | 'dm'`) gates access at the schema level. Use `'private'` or `'dm'` for user-scoped channels.
- For **directory-scoped conversations** (the `dir:<appId>` shared DO, accessed via `useConversations` / `createChannel` / `createDM`): set `Visibility: 'private'` (not `'public'`) and populate `ParticipantIds` with all participant user IDs. This is a different schema (`DIRECTORY_SCHEMAS`'s `conversations` collection) than the simple `CHANNELS_SCHEMA`, with its own permission shape.
- The SDK filters **server-side** in the DO — `canRead()` checks `ownerField`, `collaboratorsField`, and `visibilityField` before sending data over WebSocket.
- **Never rely on client-side filtering alone** — data still syncs over WebSocket and is visible in dev tools, and a determined attacker reading the WS frames bypasses any client filter you add.

`useConversations().createChannel(name)` defaults the underlying conversation record to `Visibility: 'public'` and `Type: 'public'`, which means all users in the directory see the conversation. Override the visibility by either (a) using `createDM` / `createGroupDM` instead (which set `Visibility: 'private'` and populate `ParticipantIds`), or (b) calling `useMutations<Conversation>('conversations').create({ ..., Visibility: 'private', ParticipantIds: [...] })` directly. The simple `useChannels().create(name)` from `'deepspace'` (against `CHANNELS_SCHEMA`) is a different surface and uses `type` instead of `Visibility`.
