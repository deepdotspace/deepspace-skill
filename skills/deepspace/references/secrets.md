_Load this reference before managing app secrets, migrating a legacy `.dev.vars` app, understanding cache behavior, or debugging a secrets 403 as a collaborator._

# Secrets

App secrets are platform-owned, encrypted at rest, and project-scoped. The remote store is the source of truth for **every** environment — local dev/test included. `.dev.vars` is a generated plaintext cache (written `0600`) that `dev`, `test`, and `deploy` refresh before running whenever a secrets project is linked. Never add or edit app secrets in that file directly.

Worker code reads secrets as `env.API_KEY` — identical in dev and after deploy (deploy binds them as Cloudflare `secret_text`).

## Bootstrap: one command

```bash
npx deepspace secrets setup        # link this app → <wrangler name>/prd
npx deepspace secrets set API_KEY=sk_test_...
npx deepspace dev                  # refreshes the cache, worker sees env.API_KEY
```

`setup` does everything at once: writes the link into `wrangler.toml`, **creates the remote project/config if it doesn't exist yet**, and — if the app has legacy hand-written secrets in `.dev.vars` — **migrates them** (see below). No flags needed for the standard case.

## Migrating a legacy app

Apps that predate the secrets store kept secrets as hand-written `.dev.vars` lines (still deployed via a legacy pass-through — deploy prints a nudge). Migration is the same one command:

```bash
npx deepspace secrets setup
# Imported 2 legacy secrets from .dev.vars into myapp/prd: MY_API_KEY, MY_TOKEN
# Removed the migrated lines from the local file; the remote store owns them now.
```

Rules: import runs only into an **empty** config (never overwrites existing remote values — it says so and points at `secrets upload` for a manual merge); SDK-managed keys are skipped; the migrated lines are deleted from the local file only **after** the upload is confirmed. A fully-migrated legacy `.dev.vars.<env>` file is removed entirely.

## Commands

```bash
npx deepspace secrets list                     # masked; never prints values
npx deepspace secrets set API_KEY=sk_test_...  # KEY=value or `set KEY value`; multiline/PEM values fine
npx deepspace secrets get API_KEY --plain
npx deepspace secrets delete API_KEY
npx deepspace secrets pull                     # refresh the cache without running dev
npx deepspace secrets download --no-file --format env   # stdout; also json|yaml|docker; file arg writes 0600
npx deepspace secrets upload .env [--replace]  # dotenv or JSON; --replace deletes keys absent from the file

npx deepspace secrets configs list
npx deepspace secrets configs create qa
npx deepspace secrets configs clone prd --name staging  # server-side copy — never read+re-set values manually
npx deepspace secrets configs delete staging --yes
npx deepspace secrets configure unset project config    # unlink + clear the generated cache
```

Names: `[A-Za-z_][A-Za-z0-9_]*`, conventionally `UPPER_SNAKE`. SDK-reserved binding names (`ASSETS`, `APP_OWNER_JWT`, …) are rejected. Caps: 32 KB per value, 128 KB total per config.

## Projects and configs

A **project** groups **configs** (`prd`, `staging`, `qa`, …); each config is a flat set of KEY=value secrets. Doppler users can bring their muscle memory — `-p/--project`, `-c/--config`, `--scope`, `KEY value`, `upload`/`download` all behave as expected.

Defaults are quiet: project = top-level `wrangler.toml` `name`; config = `prd` (or `<env>` for `--env <env>` targets). One-off `--project`/`--config` flags read/write remote state **without** linking; only `setup` writes the link, only `configure unset` removes it. Links are plain vars:

```toml
[vars]
DEEPSPACE_SECRETS_PROJECT = "myapp"
DEEPSPACE_SECRETS_CONFIG = "prd"

[env.staging.vars]
DEEPSPACE_SECRETS_CONFIG = "staging"   # env slots inherit the project, override the config
```

Staging flow:

```bash
npx deepspace secrets configs clone prd --name staging
npx deepspace secrets setup --config staging --env staging
```

Keep **one project per app** unless you deliberately want sharing — collaborator access is project-wide (see below).

## Checked-out apps: the advisory block

A checked-out app may carry a names-only comment block in `wrangler.toml` (the CLI maintains it on `set`/`delete`/`upload`):

```toml
# --- DeepSpace detected secrets (names only; values live in `npx deepspace secrets`) ---
#   OPENAI_API_KEY
#   STRIPE_SECRET_KEY
# --- end DeepSpace detected secrets ---
```

These are names, not values, and they describe the owner's linked config. If you don't have access to that project, run `setup --project <your-project>` to link your own and `secrets set` each listed name. Never infer values; never write `.dev.vars` directly.

## Collaborators

A collaborator ([references/collaborators.md](collaborators.md)) gets secrets access **through the app link**: run commands from the app checkout so the CLI scopes requests to the app. Within the owner's linked project they can read, write, and manage configs (writes are audited under their own id). They **cannot** create a missing project, change which project the app links to, or reach any project the owner's app doesn't link. A `secrets_project_not_linked` 403 means the owner hasn't deployed/linked yet.

## Cache behavior

- `dev` / `test` / `deploy` re-pull linked secrets before running; if the refresh fails, they **abort** rather than ship a stale cache.
- `set` / `upload` / `delete` refresh the cache immediately when the target is linked; unlinked one-off writes stay remote-only and print a link reminder.
- The generated section is fenced by a `# --- DeepSpace secrets cache: … ---` marker; content above it (non-secret local vars) is preserved across rewrites.
- `configure unset project config` unlinks and strips the generated section.

## Troubleshooting

- **Changed a secret but production still sees the old value** → redeploy. Deployed workers hold `secret_text` bindings; they don't fetch at runtime.
- **`secrets_project_not_linked` (403)** → you're accessing as a collaborator but the owner's app doesn't link this project. The owner runs `setup` + `deploy` first.
- **`Collaborators cannot create missing secrets projects` (403)** → the owner must create it (their `setup` does), then you can work inside it.
- **Pull returned 0 secrets** → check which project/config is linked (`wrangler.toml` vars) — a fresh config is legitimately empty; `-c <other>` reads a different config without relinking.
- **Name rejected** → match `[A-Za-z_][A-Za-z0-9_]*` and avoid SDK-reserved binding names.
