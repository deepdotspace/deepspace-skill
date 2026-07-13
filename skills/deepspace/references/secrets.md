_Load this reference before managing app secrets, migrating a legacy `.dev.vars` app, understanding cache behavior, or debugging a secrets 403._

# Secrets

Every app has exactly **one** platform-owned, encrypted secrets store, keyed by the immutable `DEEPSPACE_APP_ID` in `wrangler.toml` (→ [references/app-identity.md](app-identity.md)). There is **no setup or link step**: run the commands from the app directory (or pass `--app <appId>`) and they work — for the owner and collaborators alike, even before the first deploy.

The store is the source of truth for **every** environment. `.dev.vars` is a generated plaintext cache (written `0600`) that `dev` and `test` regenerate at startup; `deploy` never reads it — the store is the only deploy input. Never add or edit app secrets in that file: on a store-backed app the SDK rewrites the whole file on the next run.

Worker code reads secrets as `env.API_KEY` — identical in dev and after deploy (deploy binds each store secret as a Cloudflare `secret_text`).

## Bootstrap: no setup step

```bash
npx deepspace secrets set API_KEY=sk_test_...   # works even pre-deploy (first write registers the app id to you)
npx deepspace dev                                # regenerates the cache; worker sees env.API_KEY
```

Two propagation rules the CLI reminds you of: a **deployed** app picks up changes only at the next `deploy` (bindings are set at deploy time), and a **running** `dev` session only on restart (the cache regenerates at startup, not mid-session).

## Commands

```bash
npx deepspace secrets list                     # masked (name, version, updated); --only-names, --json
npx deepspace secrets set API_KEY=sk_... B=2   # one or more KEY=value pairs; multiline/PEM values fine
npx deepspace secrets get API_KEY --plain      # byte-exact when piped (`> key.pem`)
npx deepspace secrets delete API_KEY OLD_KEY   # already-absent keys tolerated (idempotent)
npx deepspace secrets pull                     # refresh the .dev.vars cache without running dev
npx deepspace secrets download --format json   # stdout only; dotenv (default) | json | shell
npx deepspace secrets upload .env [--replace]  # dotenv or JSON, `-` for stdin; --replace deletes keys absent from the file

npx deepspace secrets configs list
npx deepspace secrets configs create qa --copy-from prd   # server-side copy — never read+re-set values manually
npx deepspace secrets configs delete qa
```

Every command takes `-a/--app <appId>` (default: `DEEPSPACE_APP_ID` from the nearest `wrangler.toml`), `-c/--config <name>` (default `prd`), and `-e/--env <name>` (targets the `[env.<name>]` block — which is its **own app** with its own store; config defaults to `<name>`). Mixing them up is caught: `-e staging` without an `[env.staging]` app id errors and points you at `-c staging`.

Names: `[A-Za-z_][A-Za-z0-9_]*`, conventionally `UPPER_SNAKE`. SDK-reserved binding names (`APP_OWNER_JWT`, `API_WORKER_URL`, …) are rejected — the platform injects those. Caps: 32 KB per value, 128 secrets / 128 KB per config, 64 configs; oversized writes → 413. `ALLOW_DEBUG_ROUTES=true` is settable but prints a loud warning — it exposes an **unauthenticated** debug API on the deployed app.

## Configs and environments

The store holds flat KEY=value **configs**. `prd` is the convention for the top-level wrangler environment — deploy of the top-level block ships config `prd`. A named `[env.<name>]` block is a separate app (own id, own store) whose deploys ship config `<name>` of *that* store. Within one app, `-c <name>` reads/writes another config with no linking, and `configs create <new> --copy-from <existing>` copies server-side (it refuses to copy over an existing config).

Seeding a staging env's store from production crosses two apps, so `--copy-from` can't do it — pipe instead, without a temp file:

```bash
npx deepspace secrets download | npx deepspace secrets upload - -e staging
```

## Migrating a legacy app

Apps that predate the store kept hand-written secrets in `.dev.vars`. Nothing migrates them automatically, and deploy no longer reads them at all — upload once, explicitly:

```bash
npx deepspace secrets upload .dev.vars
npx deepspace deploy
```

Deploy guardrails around this: with an **empty** store and secret-looking keys in `.dev.vars`, deploy **blocks** ("Refusing to deploy: the app store has no secrets, but .dev.vars has <keys>…") so you can't silently ship an app whose production secrets get dropped — upload first, or pass `--allow-missing-secrets` to ship without them. With a non-empty store, stray local keys just draw a warning that they are **NOT** deployed.

Deletes propagate too: `secrets delete` + redeploy removes the binding from the live Worker (deploy reconciles the script's `secret_text` bindings against the store).

## Collaborators

A collaborator ([references/collaborators.md](collaborators.md)) has **full** secrets access on the app — read, write, and configs — with writes audited under their own id. Authorization is the app role (owner / collaborator) keyed by `DEEPSPACE_APP_ID`; there is nothing to link or grant per-secret. Collaborators cannot undeploy or transfer the app.

## Cache behavior

- `dev` / `test` re-pull the store at startup and regenerate `.dev.vars` (SDK-managed keys + the secrets cache). If the refresh **fails**, they abort rather than run against a stale cache; an empty or not-yet-created store is fine (no cache section, no error).
- `set` / `upload` / `delete` change the **remote store only** — a running dev session keeps its old values until restarted; `secrets pull` refreshes the file without running dev.
- The generated section starts at the `# --- DeepSpace secrets cache: … do not edit manually ---` divider and runs to end of file. Once the app is store-backed, treat the whole file as SDK-owned — hand-written lines don't survive a rewrite.
- Store-backed apps use one shared `.dev.vars` across wrangler envs (no `.dev.vars.<env>` files).

## Troubleshooting

- **Changed a secret but production still sees the old value** → redeploy. Deployed workers hold `secret_text` bindings; they don't fetch at runtime.
- **Changed a secret but local dev still sees the old value** → restart `dev` (or `secrets pull`); the cache regenerates only at startup.
- **`Not the app owner or a collaborator` (403)** → ask the owner for `collaborators add <your-email>` — or your access was revoked.
- **`This app id is registered to another user`** → you're holding someone else's id (cloned repo). `npx deepspace init --new-id` forks it into your own app (fresh store).
- **`list` shows nothing on a fresh app/config** → legitimate; the first `set` creates the store. Reads are side-effect-free and never register anything.
- **Name rejected** → match `[A-Za-z_][A-Za-z0-9_]*` and avoid SDK-reserved binding names.
- A `DeepSpace detected secrets` comment block in a scaffolded `wrangler.toml` is a static placeholder the CLI does **not** maintain — `secrets list` is the truth.
- `undeploy` keeps the store: redeploying the same app id revives the same secrets.
