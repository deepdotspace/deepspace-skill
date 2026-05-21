# Schemas, RBAC, and data visibility

Load this reference when defining a new collection, choosing a permission rule, debugging "why can't this user see/edit X," or wiring a `visibilityField` / `collaboratorsField`. Skip it for using existing schemas, scaffold-only changes that don't add collections, or pure UI work.

## Defining a collection

Add one file per collection under `src/schemas/` and register it in `src/schemas.ts`. Every collection needs `name`, `columns`, and `permissions`. The scaffold already ships `usersSchema` (in `users-schema.ts`) and `settingsSchema` (in `admin-schema.ts`).

- **`usersSchema` is required.** It uses `USERS_COLUMNS` from `deepspace/worker` and the SDK's `useUser` / `useUsers` / `useUserLookup` hooks plus the auth user-row writes all expect a `'users'` collection with this exact shape. Add columns to it if you need (e.g., a `bio` field), but never rename it, replace it, or drop the `USERS_COLUMNS` baseline.
- **`settingsSchema` is just a scaffold starter** for admin-only key/value config. No SDK feature depends on it — customize the columns freely, or remove it entirely if your app doesn't need an admin settings store.

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

### JSON columns

Use `interpretation: { kind: 'json' }` for columns holding structured data (objects, arrays). The SDK handles serialization at the worker boundary: **pass the value directly on write (no `JSON.stringify`) and it comes back already parsed on read (no `JSON.parse`)** — this applies to `useRecord` / `useRecords` / `useMutations` on the client and to `tools.get` / `tools.query` inside server actions. Calling `JSON.parse` on the read side will throw because you're parsing an already-parsed object.

```typescript
{ name: 'tags', storage: 'text', interpretation: { kind: 'json' } },
// write:  mutations.create({ tags: ['a', 'b'] })       ← pass array directly
// read:   record.data.tags  // → ['a', 'b']            ← already an array
```

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

Advanced rules (supported by `PermissionRule` but rarely needed — check the `PermissionRule` type in `node_modules/deepspace/dist/index.d.ts` or `dist/worker.d.ts` before using):

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

## Schema-lint warnings

The SDK runs a lightweight lint when each schema is registered (worker startup, first DO boot). Warnings print to the worker console prefixed `[schema-lint]` — they don't block boot, but each one flags a real privacy or correctness foot-gun. Treat them as errors:

- **`visibilityField` declared, a role has `read: true`, but no role uses `read: 'published'` / `'shared'`** — the visibility column does nothing because the `read: true` roles see every row regardless of `visibility`. Either drop `visibilityField` (you didn't mean to gate reads) or change at least one role to `read: 'published'` (owner OR public) / `'shared'` (owner OR collaborator OR public) so the filter actually runs.
- **`ownerField` set but the named column is not `userBound: true`** — owner-spoofing risk. `userBound: true` is what tells the DO to overwrite the column with the caller's verified userId on write, instead of trusting whatever the client sent. Add `userBound: true` (and ideally `immutable: true`) to the column definition.
- **`userBound: true` on a non-`text` storage column** — the SDK can only coerce a userId into a text field; on `number` columns the write will fail at runtime (the `storage` union is `'number' | 'text'`). Change `storage` to `'text'`.

These are the most common shapes of "looks secure but isn't" — if a `[schema-lint]` line appears at `dev` startup, fix the schema before continuing.
