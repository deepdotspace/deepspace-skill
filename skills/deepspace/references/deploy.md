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
