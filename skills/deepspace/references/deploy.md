_Load this reference for deploy mechanics, the `.dev.vars` contract, and secret handling. For managing app secrets or understanding `.dev.vars` cache behavior, also read `references/secrets.md`. For the login contract and the full CLI command catalog, see `references/cli.md`._

# Deploy, `.dev.vars`, and secrets

## Deploy (`npx deepspace deploy`)

```bash
npx deepspace deploy   # → <wrangler.name>.app.space
```

The subdomain is the `name` field in `wrangler.toml`, **not** the app-folder name — edit it there if you want a different deploy target; `deploy` does not accept a name override. It must match `^[a-z0-9](?:-?[a-z0-9])+$` (2-63 chars, lowercase); `dev` and `deploy` fail-fast on a non-canonical name (see `references/architecture.md` § App-name rules). Deploy requires a logged-in session — re-run `npx deepspace login` if it expired (full login contract → `references/cli.md`).

On an **initial build**, run the pre-deploy checklist in `references/uiux.md` §5 first (home replaced, theme picked, browser-default primitives removed, toasts wired). On follow-up deploys with those already verified, just run the command.

## `.dev.vars` contract

`dev` / `test` rewrite the SDK-managed keys: `AUTH_JWT_PUBLIC_KEY`, `AUTH_JWT_ISSUER`, `AUTH_WORKER_URL`, `API_WORKER_URL`, `PLATFORM_WORKER_URL`, `OWNER_USER_ID`, `APP_OWNER_JWT`, `APP_IDENTITY_TOKEN`, `ALLOW_DEBUG_ROUTES`. `APP_IDENTITY_TOKEN` is only populated after the first `npx deepspace deploy` (deploy-worker mints it on app registration) — only matters if you use payments or `captureScreenshot` locally before deploy.

App secrets now live in the remote DeepSpace secrets store for every environment, including local-only dev/test. `.dev.vars` is a generated local cache that `dev`, `test`, and `deploy` refresh when `wrangler.toml` links a secrets project/config. Checked-out apps may list required secret names in a `DeepSpace required secrets` comment block in `wrangler.toml`; set those values with the CLI. Do **not** add or update app secrets by editing `.dev.vars`; use `npx deepspace secrets ...` instead. Detailed command usage, project/config mapping, and troubleshooting -> `references/secrets.md`.

Limits enforced server-side at deploy:
- Name must match `^[A-Z_][A-Z0-9_]*$`.
- Per-value cap: **32 KB**. Total across all user secrets: **128 KB**. Raw JSON payload cap: **1 MB** → 413.
- Name must not collide with `RESERVED_BINDING_NAMES` (11 SDK-owned), any declared custom binding, or any DO class in `__DO_MANIFEST__`. Read `references/bindings.md` if a collision trips you.

## Handling rules — `.dev.vars` can hold live credentials

The file holds a live `APP_OWNER_JWT` (signed against the user's identity) plus a plaintext local cache of any linked remote secrets. Treat its contents as secret throughout the session, not just at commit time:

- **Never read the file's values into your output.** No `cat .dev.vars`, no `head`/`grep`/`Read`-then-paste, no inclusion in summaries, generated docs, READMEs, commit messages, PR bodies, or screenshots. To confirm a key is present, check the *key name* (`grep -l '^STRIPE_SECRET_KEY=' .dev.vars` — files-only, not content) and report presence/absence — never the value.
- **Never write app secrets directly to `.dev.vars`, even for local-only testing.** The CLI is the source-of-truth path for local, test, staging, and production. If a local test needs a secret, link the appropriate config and run `npx deepspace secrets set KEY=value` or `npx deepspace secrets upload FILE`.
- **Never pass secret values as shell env or unrelated CLI args.** `MY_KEY=… npx deepspace dev` leaks into shell history, `ps aux`, and child-process env dumps. Use `npx deepspace secrets set KEY=value` or `npx deepspace secrets upload FILE`.
- **Never commit `.dev.vars`.** The scaffold's `.gitignore` covers it; don't add a `!` exception, don't `git add -f`, don't paste its contents into a tracked file. If `git status` shows it untracked, that's correct — leave it.
- **Never assert on secret values in tests.** Test that auth *works* (a request returns 200, a webhook fires) — never `expect(env.STRIPE_SECRET_KEY).toBe('sk_live_…')`.
- **Adding a new linked secret** is `npx deepspace secrets setup --config <config>` once per app/env, then `npx deepspace secrets set KEY=value`. Use `--project <project> --config <config>` for one-off reads/writes; create staging-like configs with `configs clone prd --project <project> --name staging` instead of manually copying values. `set` updates the remote store; `dev`, `test`, and `deploy` refresh the generated cache only when that project/config is linked. A one-off `--project` / `--config` write stays remote-only and prints a link reminder. No `wrangler secret put`, no out-of-band copy.

## Staging / multiple environments (`--env`, v0.4+)

```bash
npx deepspace deploy --env staging   # deploys the [env.staging] block
```

`--env <name>` deploys a named `[env.<name>]` wrangler block to its own subdomain with its own isolated Durable Objects — use it to rehearse risky changes (schema migrations, bulk imports, destructive backfills) before production. Omit `--env` to deploy the top-level config. The build runs with `CLOUDFLARE_ENV=<name>`, so the Cloudflare Vite plugin applies that env's overrides. DeepSpace still uses a single generated `.dev.vars` cache. Linked secrets default to config `prd` for top-level deploys and config `<name>` for `--env <name>` unless `wrangler.toml` overrides them.

Two rules the CLI fail-fasts on:

1. **Distinct, canonical `name` required.** `[env.<name>].name` must be set (e.g. `myapp-staging`) and match `^[a-z0-9](?:-?[a-z0-9])+$`, or deploy aborts. It's the deploy subdomain.
2. **Named environments do NOT inherit bindings or vars.** Wrangler inherits only a few top-level keys (`main`, `compatibility_date`, `compatibility_flags`). `vars`, `durable_objects`, `migrations`, `assets`, and any `kv`/`r2`/`d1` must be **repeated** inside the `[env.<name>]` block, or the deployed worker is missing them and 500s at runtime.

**Isolation comes from `APP_NAME`, and the CLIENT must match it.** Rooms are scoped `app:${APP_NAME}` (`src/constants.ts` → `SCOPE_ID`). Give the env its own `APP_NAME` in `[env.<name>].vars` and it gets a separate, empty DO namespace. But `APP_NAME` is *also* baked into the client bundle — if `src/constants.ts` hardcodes it, a staging build connects the browser to the **production** room (you'll see empty/sample data while your writes land elsewhere). Fix: read it from the build env and inject per-env in `vite.config.ts`:

```ts
// src/constants.ts
export const APP_NAME = (import.meta.env.VITE_APP_NAME as string) || 'myapp'

// vite.config.ts — resolve from the active wrangler env (CLOUDFLARE_ENV)
import { parse as parseToml } from 'smol-toml'
function resolveAppName() {
  const env = process.env.CLOUDFLARE_ENV
  const cfg = parseToml(readFileSync('wrangler.toml', 'utf8')) as any
  return (env ? cfg.env?.[env]?.vars?.APP_NAME : cfg.vars?.APP_NAME) || 'myapp'
}
export default defineConfig({ define: { 'import.meta.env.VITE_APP_NAME': JSON.stringify(resolveAppName()) }, /* … */ })
```

**Staging-only worker routes** (a temporary import/admin endpoint, extra debug surface) should gate on `env.APP_NAME.includes('staging')` (or the presence of a staging-only secret) so the same `worker.ts` exposes them on staging but 404s in production.

**Tear-down:** `npx deepspace undeploy --env staging` removes the staging app (same `--env` flag).
