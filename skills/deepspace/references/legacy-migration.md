_Load this reference when an app predates the app-id model — `npx deepspace apps` shows a name-based id (not `app_…`), wrangler.toml has no `DEEPSPACE_APP_ID`, or a deploy fails with "name … is taken by another app"._

# Migrating a legacy (pre-app-id) app

Apps deployed before the immutable-id era are registered under a **name-based id**:
`npx deepspace apps --json` shows `"appId": "hopkins"`, not `app_<ULID>`, and often
`"hasSecretsStore": false`. Both id forms are valid in `DEEPSPACE_APP_ID`. Migration is
two steps **in this order** — the secrets store keys off the app id, so adopt the id
*before* writing any secrets:

## 1. Adopt the legacy id — never let one get minted for a deployed name

[references/app-identity.md](app-identity.md) says deploy/init mint an id when none
exists — but they first try to **adopt** the id of an app you own with a matching name.
For a legacy app that adoption is what you want. Adopting a legacy name-as-id app you
**own** stays automatic; if a collaborator or admin adopts one they can deploy but
don't own, deploy asks them to confirm first (or requires `--adopt` non-interactively). If the lookup misses and a fresh
`app_…` id gets minted instead, you now hold a brand-new app identity, and the next
deploy tries to register it under your existing subdomain:

```
Deploy failed
└  The name myapp.app.space is taken by another app.
```

That error against your **own** app name = a minted id shadowing a legacy registration.
Fix it by hand — `init` won't overwrite an existing id (that's the `--new-id` fork flag):

```bash
npx deepspace apps --json    # the legacy entry's appId is its name
```

```toml
[vars]
DEEPSPACE_APP_ID = "myapp"            # legacy name-based id, verbatim

[env.staging.vars]
DEEPSPACE_APP_ID = "myapp-staging"    # each [env.*] is its own app, same rule
```

## 2. Then migrate the secrets

With the right id in place, follow "Migrating a legacy app" in
[references/secrets.md](secrets.md) (`secrets upload .dev.vars`, per-env stores, the
empty-store deploy guardrail). Two legacy-specific notes:

- Hand-written lines from the removed `AppSecretsRoom` era (e.g.
  `APP_SECRETS_LOCAL_FALLBACK`) are dead — delete rather than upload them.
- Secrets written **before** step 1 (under a wrongly-minted `app_…` id) live in that
  orphan app's store: harmless, but invisible to your real app. Re-upload under the
  adopted id and `secrets configs delete` anything created in the wrong store. Values
  never change mid-migration, so production is safe throughout — the store only becomes
  the live input at the next `deploy`.
