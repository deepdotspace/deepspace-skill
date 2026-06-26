_Load this reference for deploy mechanics, the `.dev.vars` contract, and secret handling. For the login contract and the full CLI command catalog, see `references/cli.md`._

# Deploy, `.dev.vars`, and secrets

## Deploy (`npx deepspace deploy`)

```bash
npx deepspace deploy   # → <wrangler.name>.app.space
```

The subdomain is the `name` field in `wrangler.toml`, **not** the app-folder name — edit it there if you want a different deploy target; `deploy` does not accept a name override. It must match `^[a-z0-9](?:-?[a-z0-9])+$` (2-63 chars, lowercase); `dev` and `deploy` fail-fast on a non-canonical name (see `references/architecture.md` § App-name rules). Deploy requires a logged-in session — re-run `npx deepspace login` if it expired (full login contract → `references/cli.md`).

On an **initial build**, run the pre-deploy checklist in `references/uiux.md` §5 first (home replaced, theme picked, browser-default primitives removed, toasts wired). On follow-up deploys with those already verified, just run the command.

## `.dev.vars` contract

`dev` / `test` rewrite **only the 9 SDK-managed keys**: `AUTH_JWT_PUBLIC_KEY`, `AUTH_JWT_ISSUER`, `AUTH_WORKER_URL`, `API_WORKER_URL`, `PLATFORM_WORKER_URL`, `OWNER_USER_ID`, `APP_OWNER_JWT`, `APP_IDENTITY_TOKEN`, `ALLOW_DEBUG_ROUTES`. They live above a `# --- not managed by the SDK; preserved across dev/test runs ---` divider the CLI writes itself. `APP_IDENTITY_TOKEN` is only populated after the first `npx deepspace deploy` (deploy-worker mints it on app registration) — only matters if you use payments or `captureScreenshot` locally before deploy.

Anything you add **below** that divider — third-party API tokens, custom feature flags, your own service URLs — is preserved verbatim across `dev` / `test` runs, **and shipped to prod as `secret_text` bindings on `deploy`** (same `env.MY_KEY` access in dev and prod; no `wrangler secret put` step).

Limits enforced server-side at deploy:
- Name must match `^[A-Za-z_][A-Za-z0-9_]*$`.
- Per-value cap: **32 KB**. Total across all user secrets: **128 KB**. Raw JSON payload cap: **1 MB** → 413.
- Name must not collide with `RESERVED_BINDING_NAMES` (11 SDK-owned), any declared custom binding, or any DO class in `__DO_MANIFEST__`. Read `references/bindings.md` if a collision trips you.

## Handling rules — `.dev.vars` holds live credentials

The file holds a live `APP_OWNER_JWT` (signed against the user's identity) plus whatever third-party tokens (Stripe, OpenAI, …) the user wrote below the divider. Treat its contents as secret throughout the session, not just at commit time:

- **Never read the file's values into your output.** No `cat .dev.vars`, no `head`/`grep`/`Read`-then-paste, no inclusion in summaries, generated docs, READMEs, commit messages, PR bodies, or screenshots. To confirm a key is present, check the *key name* (`grep -l '^STRIPE_SECRET_KEY=' .dev.vars` — files-only, not content) and report presence/absence — never the value.
- **Never pass secrets as CLI args.** `MY_KEY=… npx deepspace dev` leaks into shell history, `ps aux`, and child-process env dumps. Write the line into `.dev.vars` below the divider and read it via `env.MY_KEY` in worker code.
- **Never commit `.dev.vars`.** The scaffold's `.gitignore` covers it; don't add a `!` exception, don't `git add -f`, don't paste its contents into a tracked file. If `git status` shows it untracked, that's correct — leave it.
- **Never assert on secret values in tests.** Test that auth *works* (a request returns 200, a webhook fires) — never `expect(env.STRIPE_SECRET_KEY).toBe('sk_live_…')`.
- **Adding a new secret** is one step: append `KEY=value` below the divider, then `npx deepspace dev` / `deploy`. The CLI uploads it as `secret_text` on deploy — no `wrangler secret put`, no out-of-band copy.

## Staging / multiple environments (`--env`, v0.4+)

```bash
npx deepspace deploy --env staging   # deploys the [env.staging] block
```

`--env <name>` deploys a named `[env.<name>]` wrangler block to its own subdomain with its own isolated Durable Objects — use it to rehearse risky changes (schema migrations, bulk imports, destructive backfills) before production. Omit `--env` to deploy the top-level config. The build runs with `CLOUDFLARE_ENV=<name>`, so the Cloudflare Vite plugin applies that env's overrides and reads **`.dev.vars.<name>`** instead of `.dev.vars` (so per-env secrets like a staging-only gate live in `.dev.vars.staging`, below the same divider).

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
