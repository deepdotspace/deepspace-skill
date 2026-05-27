# Custom bindings & per-tenant metering

Load this reference when the app needs a Cloudflare resource beyond the SDK defaults — **Vectorize, AI, R2, KV, D1, Queues, Browser Rendering, Hyperdrive, or Analytics Engine** — when wiring per-tenant cost tracking via `USAGE_EVENTS`, when bootstrapping a D1 schema with `runMigrations`, or when a deploy fails with a binding-related error. Skip it for apps that only use the SDK's built-in DOs (`AppRecordRoom` / `AppYjsRoom` / `AppCanvasRoom` / `AppPresenceRoom` / `AppCronRoom` / `AppJobRoom`) and the `integration.post(...)` proxy.

## TL;DR

1. Declare the binding in `wrangler.toml` exactly the way you would for a stand-alone Worker.
2. For per-app resources (Vectorize, R2, KV, D1, Queues), set the ID field to **`"auto"`** and add the required companion field (`dimensions`+`metric` / `title` / `database_name`).
3. Deploy. The deploy worker validates the manifest, provisions any `"auto"` resources on the platform CF account, persists their IDs in `app-resources/<appName>.json`, and reuses them on every subsequent deploy.
4. Optional: call `runMigrations(env.MY_DB, [...])` at worker startup to bootstrap D1 schema, and `meterAi` / `meterVectorize` after each call to roll cost up per tenant.

## Declare in `wrangler.toml`

The CLI reads `.wrangler/deploy/config.json` (the normalized output of `vite build`), extracts the non-DO bindings, validates them client-side, and posts the manifest to the deploy worker. Standard Cloudflare syntax — nothing DeepSpace-specific in the declaration:

```toml
# Vectorize
[[vectorize]]
binding = "VEC"           # name visible on env (env.VEC)
index_name = "auto"       # or a pre-existing index name
dimensions = 768          # required when index_name="auto"
metric = "cosine"         # required when index_name="auto" (cosine | euclidean | dot-product)

# R2
[[r2_buckets]]
binding = "FILES"
bucket_name = "auto"      # or a pre-existing bucket name

# KV
[[kv_namespaces]]
binding = "CACHE"
id = "auto"               # or a pre-existing KV namespace UUID
title = "my-cache"        # required when id="auto" — human-readable namespace title

# D1
[[d1_databases]]
binding = "MY_DB"
database_id = "auto"      # or a pre-existing D1 database UUID
database_name = "my-app-db"  # required when database_id="auto"

# Queues — producer
[[queues.producers]]
binding = "MAILER"
queue = "auto"            # or a pre-existing queue name

# Workers AI (no provisioning needed)
[ai]
binding = "AI"

# Browser Rendering (no provisioning)
[browser]
binding = "BROWSER"

# Hyperdrive — `"auto"` is NOT supported; provision in CF dashboard first
[[hyperdrive]]
binding = "PG"
id = "<your-hyperdrive-config-id>"

# Analytics Engine (rare — USAGE_EVENTS is auto-attached, declare only for app-specific datasets)
[[analytics_engine_datasets]]
binding = "EVENTS"
dataset = "my_events"
```

The validator (`validateBindingManifest` in `deepspace/worker`) rejects anything outside `ALLOWED_BINDING_TYPES`: `vectorize`, `ai`, `r2_bucket`, `kv_namespace`, `d1`, `queue`, `browser_rendering`, `analytics_engine`, `hyperdrive`.

## `"auto"` autoprovisioning

The deploy worker recognizes the literal string `"auto"` in the ID field of provisionable types and creates the resource on the platform CF account the first time you deploy:

| Type           | Sentinel field         | Required companion        | CF-side name                            |
|---             |---                     |---                        |---                                      |
| `d1`           | `database_id = "auto"` | `database_name`           | The `database_name` you supplied (verbatim) |
| `kv_namespace` | `id = "auto"`          | `title`                   | The `title` you supplied (verbatim)     |
| `vectorize`    | `index_name = "auto"`  | `dimensions`, `metric`    | `app-<appName>-<binding.toLowerCase()>` |
| `r2_bucket`    | `bucket_name = "auto"` | —                         | `app-<appName>-<binding.toLowerCase()>` |
| `queue`        | `queue = "auto"`       | —                         | `app-<appName>-<binding.toLowerCase()>` |
| `hyperdrive`   | not supported          | —                         | —                                       |

Vectorize / R2 / Queue names get **auto-prefixed** with `app-<appName>-` so two different apps' `"auto"` bindings can't collide on the platform CF account. D1 and KV use the user-supplied `database_name` / `title` verbatim — choose unique names yourself (e.g., `my-app-cards-db`) to avoid collisions.

Provisioned IDs persist in `app-resources/<appName>.json` on the platform R2 bucket. Subsequent deploys re-read the registry and skip creation; if the registry is missing but the resource exists on CF (e.g., from a prior failed deploy), the deploy worker **adopts on conflict** — it looks the resource up by name (or `database_name` / `title`) and writes the ID back into the registry.

## Reserved names — collisions to avoid

`RESERVED_BINDING_NAMES` (11 SDK-owned, always present on every deploy):

```
ASSETS, PLATFORM_WORKER, API_WORKER, APP_NAME, OWNER_USER_ID,
AUTH_JWT_PUBLIC_KEY, AUTH_JWT_ISSUER, AUTH_WORKER_URL,
APP_IDENTITY_TOKEN, APP_OWNER_JWT, USAGE_EVENTS
```

`validateBindingManifest` rejects any custom-binding `name` in `RESERVED_BINDING_NAMES` and any intra-manifest duplicate. It does **not** check against DO class names (`__DO_MANIFEST__`) — those live in a separate manifest. If you accidentally name a custom binding `RECORD_ROOMS`, the deploy validator won't catch it; you'll find out at runtime when the DO binding shadows it (or the WfP upload errors). Pick a name that doesn't collide with either set yourself. (User secrets, in contrast, *are* validated against the union of `RESERVED_BINDING_NAMES`, custom-binding names, and DO class names at deploy time — see `.dev.vars` contract in SKILL.md.)

## D1 bootstrap — `runMigrations`

Auto-provisioned D1 gives you an empty database. Use `runMigrations` to create your tables idempotently at worker startup:

```typescript
import { runMigrations } from 'deepspace/worker'

// In worker.ts, inside the fetch handler or once at module init:
await runMigrations(env.MY_DB, [
  `CREATE TABLE notes (
     id TEXT PRIMARY KEY,
     body TEXT NOT NULL,
     created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
   );
   CREATE INDEX idx_notes_created ON notes(created_at);`,

  `ALTER TABLE notes ADD COLUMN tags TEXT;`,
])
```

Contract:
- Each array entry is one migration; the runner tracks applied indexes in a `_dpc_migrations(idx INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)` meta-table.
- Each migration string can contain multiple `;`-separated statements. **Don't put `;` inside string literals** — the split is naive (`sql.split(';')`).
- Statements run via `db.prepare(sql).run()`, not `exec()` — sidesteps D1's documented newline-terminated `exec` quirks.
- Idempotent: re-running with the same array is a no-op. **Append new migrations to the end; never reorder or delete entries.**
- Returns `{ fromVersion, toVersion, applied }` — useful for log lines on cold start.
- Throws on any individual migration failure; the failed migration's row is **not** inserted, so the next deploy retries it.
- A meta-table is used because D1's SQLite authorizer rejects `PRAGMA user_version` writes with `SQLITE_AUTH`.

## Per-tenant metering

Every deployed app gets a `USAGE_EVENTS` AnalyticsEngine binding **automatically** — don't declare it in `wrangler.toml`, it's in `RESERVED_BINDING_NAMES`. The metering helpers in `deepspace/worker` write rows indexed by `OWNER_USER_ID` so the per-app dashboard can roll cost up per tenant.

```typescript
import { meterAi, meterVectorize, meterUsage } from 'deepspace/worker'

// Workers AI — splits into op='input' / op='output' events; both 0 → op='call'
meterAi(env, '@cf/meta/llama-3.1-8b', { inputChars, outputChars })

// Vectorize — units = (vectors + storedCount) * dims for queries (additive),
//             vectors * dims for upsert/delete/getByIds
meterVectorize(env, 'docs', 'query', { vectors: 1, dims: 768, storedCount })

// Generic fallback — Browser Rendering, Hyperdrive, your own kind label
meterUsage(env, 'browser', { id: 'render', units: 1, count: 1 })
```

Each helper returns `boolean`: `false` when `USAGE_EVENTS` is absent (local dev without dataset) or when AnalyticsEngine throws. Metering **never breaks the calling code path** — wrap in a `void` if you prefer to ignore the return.

Cost rollup multipliers live in `COST_RATES` (also exported from `deepspace/worker`) — multiply `SUM(_sample_interval * doubles[1])` by the rate to get USD without re-querying CF's billing API.

## Undeploy / cleanup

`npx deepspace deploy` triggers provisioning. `npx deepspace undeploy` is the corresponding teardown:

- **D1 / KV / Vectorize / Queues**: deleted via CF API and removed from the registry.
- **R2 buckets**: deleted via CF API, but **non-empty buckets are skipped** (CF returns 409 / "not empty") to preserve user uploads. Clear the bucket manually if you want it gone with the app.
- **Hyperdrive**: never auto-provisioned, never auto-deleted.

## Gotchas

- **Vectorize dimension / metric mismatch is not caught at deploy.** If you change `dimensions` from 768 → 1536 after the index was created, adoption succeeds and the failure surfaces at first-vector-insert at runtime. Delete the index and redeploy if you really need to change shape.
- **`"auto"` is platform-side only.** Local dev does not provision; the binding only resolves at `npx deepspace deploy`. For local development against a real CF resource, point the binding at a manually-created resource by ID instead of `"auto"`.
- **User-secret names cannot collide with custom-binding names or DO class names.** The deploy worker rejects with 400 before forwarding to WfP. If you hit this, rename the `.dev.vars` key or the binding.
- **`runMigrations` is naive on `;`-inside-literals.** If you need DDL with embedded semicolons (extremely rare; mostly only triggers when seeding fixture rows from a migration), split that statement into its own array entry without a trailing `;`.
- **Hyperdrive can be declared but cannot use `"auto"`.** Provision the Hyperdrive config in the CF dashboard, copy the ID into `wrangler.toml`, and redeploy.
- **R2 + Vectorize CF-side names are not the binding name.** When debugging in the CF dashboard, look for `app-<appName>-<bindingLower>` — that's the actual resource name. The friendly `binding = "VEC"` is only what your worker code sees.
