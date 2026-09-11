---
name: deepspace
description: >
  Use when building or maintaining real-time collaborative apps with the
  DeepSpace SDK on Cloudflare Workers; when code imports `deepspace`,
  `deepspace/worker`, or uses `RecordRoom`; when running `npx deepspace`; or
  when the task involves app.space deploys, live sync, presence, collaborative
  editing, RBAC, messaging, payments, Durable Objects, or DeepSpace source; or
  when creating or migrating native DeepSpace documentation with
  `documentation.json`, Markdown/MDX, the documentation feature, or an
  explicitly attached documentation domain.
---

# DeepSpace

DeepSpace is one package for real-time collaborative apps on Cloudflare
Workers. It provides auth, RBAC, synchronized records, messaging, integrations,
payments, and deploys to `<name>.app.space`.

This skill is the bootstrap: how to start, how to operate, and how to consult
the documentation. The documentation at <https://docs.deep.space> is the
authority for everything else — it is written to be opinionated, so when it
recommends an approach, take that as the default rather than one option among
many.

## One source authority

Every app has exactly one Git authority — DeepSpace source (packaged,
commit-first) or GitHub source (manual; deploys ship the local working tree,
dirty bytes included). A new app starts unclaimed, then its first
source-producing action latches one authority **once, permanently**: a deploy
from a checkout with a selected GitHub remote claims that repository, while
the first `deepspace push` or a deploy without a GitHub remote claims
DeepSpace. There is no manual declaration or later transfer. Never run
`deepspace push` before the first GitHub deploy unless the user has chosen
DeepSpace source; after a GitHub claim, all DeepSpace source verbs refuse with
`source_managed_by_github`. `deepspace app source` is read-only (the old
setter refuses `source_inferred`). Never maintain two sources of truth, and
read the source-control and workspaces docs before any source, push, pull, or
clone operation — the docs, not this skill, state what each verb does under
each authority.

## Sharing and handing over an app

Collaborators and ownership transfer (`deepspace app collaborators …`,
`deepspace app transfer …`) change who can deploy, read secrets, and own the
app. Read the app-identity guide before either — it states exactly what each
grant confers and what a transfer takes away — and treat both as decisions to
surface to the user, not steps to run in passing.

## How to read the documentation

Consult the docs BEFORE building in an area, not after something breaks. The
reading procedure:

1. **Fetch the index once per task area:** <https://docs.deep.space/llms.txt>
   — generated from the docs on every deploy, so it is never stale — lists
   every page with a one-line summary.
2. **Pick 1–2 pages from it and fetch each as Markdown** by appending `.md`
   to the page URL (`https://docs.deep.space/guides/authentication.md`).
   If the page you picked lacks the answer, do not wander adjacent pages —
   go to step 3.
3. **To prove whether a topic exists at all**, fetch
   <https://docs.deep.space/llms-full.txt> once (the whole corpus in one
   file; each page ends with `Source: /route.md`) and grep it. A confirmed
   absence means the docs lag the build — fall back to the installed
   `.d.ts` or the CLI's own `--help`.
4. **Use MCP for point lookups when its tools are already available:**
   `https://docs.deep.space/mcp` exposes `documentation_search` and
   `documentation_read`. If those tools are unavailable or fail, use the
   Markdown URLs above with the harness's existing fetch tool or a bounded
   HTTP request (for example, `curl -fsSL --max-time 20 <url>`). Building an
   app does not require MCP registration: configure a docs server only when
   the user asks for that setup, and keep it separate from dependency-install
   recovery. Search cannot prove a topic is absent — use step 3 for that.
5. **For exact type signatures, read the installed package** —
   `ls node_modules/deepspace/dist/*.d.ts` (in the SDK monorepo itself:
   `packages/deepspace/dist/`) — authoritative when any doc lags the
   installed version.

The docs' shape, so you pick pages fast: `/get-started/*` is setup and
project layout; `/concepts/*` is the runtime model — read it before touching
`worker.ts`, schemas, or sync behavior; `/guides/*` is one feature or
lifecycle area per page; `/design/*` is visual design; `/sdk-reference/*` is
exact exports per module; `/cli-reference/*` is the CLI, including its exit
codes and machine-executable `action` contract. The catalogs are live CLI
calls, not pages: `npx deepspace integrations list` / `integrations info
<integration>/<endpoint>` and `npx deepspace add --list`.

## Operating sequence

1. **Authenticate before running app commands.**

   ```bash
   npx deepspace auth whoami --json
   npx deepspace auth login # only when signed out
   ```

   Login opens browser OAuth and polls for up to ten minutes. Leave it in the
   foreground and let the user finish it; never request, invent, or handle a
   password. A container or CI shell has no browser: run `auth login --help`
   and use the operator-supplied env credentials it names — that help is the
   authority on which variables they are — and never put a password on a
   command line.

2. **Scaffold instead of assembling the runtime by hand.**

   Use a supported Node version from the installation docs and **npm 11.6+
   for npm-based scaffolds**. Check `node --version` and `npm --version`
   first: npm 10's peer resolver can crash on the template's Vitest dependency
   even when Node is supported. If installation fails, retain the actual error
   and runtime versions before diagnosing it or choosing a recovery; keep the
   app's selected package manager and lockfile consistent.

   ```bash
   npm create deepspace@latest <app-name>
   cd <app-name>
   npx deepspace dev start
   ```

   App ids are server-minted at registration, and apps **register on first
   use**: the first id-needing verb (`deploy`, `dev start`, `test run`,
   `push`, a `secrets` write) mints the id under whichever login and plane
   the shell holds, announced on stderr naming the account email. Check
   `auth whoami` BEFORE that first verb so the registration lands on the
   intended account; when the shell's login is not the intended owner, log
   in as the owner first (or run `npx deepspace app init` as them) rather
   than minting an id you then have to throw away. A scaffold made while
   signed out is fine — it registers the same way once someone logs in. Any
   `app_not_registered` or `app_not_initialized` refusal means exactly that
   and nothing else.

3. **Inspect catalogs before hand-building a feature.** Names alone are not a
   sufficient fit check.

   ```bash
   npx deepspace add --list
   npx deepspace add --info <feature>
   npx deepspace integrations list
   npx deepspace integrations info <integration>/<endpoint>
   ```

4. **Extend the scaffold.** Keep schemas in `src/schemas.ts` and
   `src/schemas/`, routes in `src/pages/`, app providers in
   `src/pages/(app)/_layout.tsx`, and Durable Object wiring in `worker.ts`.
   `src/constants.ts` exposes the display `APP_NAME`, immutable `APP_ID`, and
   primary `SCOPE_ID = app:${APP_ID}`.

5. **Test runtime changes, then deploy.**

   ```bash
   npx deepspace test run        # the quick default; it names what it skipped
   npx deepspace test run unit   # seconds: renders every public page in Node — a page that needs a browser fails here, not at deploy
   npx deepspace test run all    # every spec, including ones you added
   npx deepspace deploy
   ```

   Multi-user behavior needs a two-user test. Use a distinct port for parallel
   apps or worktrees. Never kill a sibling session's server.

## Shared agent tools

Keep `buildTools` in `src/ai/tools.ts` as the single tool definition and
register it once in `worker.ts` with
`registerAgent(app, { tools: buildTools })`; do not duplicate tools or mount
the REST routes yourself. Both the website and local agent are enabled by
default; use `local: false` or `inApp: false` for only one surface.

When access depends on app policy, pass a developer-owned
`authorize({ userId, claims, request, env })` callback to `registerAgent`. It
returns a boolean (or promise) for subscription, team, role, or app-data checks,
applies to both surfaces after identity and membership verification, and can
only narrow the app's existing RBAC.

A local agent discovers before invoking:

```bash
npx deepspace agent tools <app> --json
npx deepspace agent invoke <app> <tool> --input-file tool-input.json --json
```

Use only a returned tool and follow its description and input schema. These
stateless commands reuse the selected CLI session—there is no connect or
separate consent step—but a CLI login proves identity, not app membership. Use
the CLI rather than raw REST, and follow refusals as described below.

## When a command refuses

Every refusal is a stable `code`, an exit code, and at most one executable
`action`. Branch on those, never on the prose:

- **Exit 1** means fix the stated cause; retrying unchanged will not help.
  **Exit 2** means the command did what it could and one local step or
  judgment remains.
- **Run the `action` when one is shipped** — as the argv it gives, in the
  `cwd` it gives. **When none is shipped, do not guess a remedy.** Absence
  is deliberate: the refusal names choices (fork or restore, finish or abort,
  free a slot or upgrade) that belong to the user, or states a fact to
  inspect. Read the message, then surface the choice.
- The refusal itself now names the two states agents used to misdiagnose: a
  **wrong plane** (`not_authenticated` says which plane the command selected,
  which one holds your session, and which variable to unset — do not "log in
  again") and a **malformed app id** (`invalid_app_id` for a
  `DEEPSPACE_APP_ID` in wrangler.toml that is not a valid app id — do not
  run `app init --new-id`, which would orphan the app; plain `app init`
  refuses over a malformed id). Via `--app` the codes
  differ: a malformed `app_…` value answers `invalid_app`; a non-`app_`
  string is treated as a subdomain NAME — one that is not a legal name
  (uppercase, dots, wrong length) answers `invalid_app` without a lookup,
  and a legal name that matches no app answers `app_not_found`, which
  means check the spelling with `app list`, not that the id was
  malformed. (`transfer accept` is the one exception: it takes a raw
  `app_…` id only and answers `invalid_app` for any name.)

The CLI overview (`/cli-reference/overview`) is the contract — exit codes,
the `action` rules, and a table of codes by command. Do not pre-check
preconditions with separate probes; run the operation and read its refusal.

## Operate what you shipped

A deploy that reports `serving: confirmed` is the start of the app's life,
not the end of the task. Before declaring done, look at it running:

```bash
npx deepspace logs --follow --json   # what the worker actually did
npx deepspace activity                # pushes, workspaces, releases
npx deepspace releases                # the ledger, and what is rollback-able
npx deepspace app usage               # credits, quota, per-integration spend
```

Two things the docs explain and you should not infer: a **schedule arms on
the app's first request** (deploy sends one; the scheduled-jobs guide says
what to check when it did not), and a **caught error is a `log` line, not an
`exception`** — the `logs` reference says how to read `outcome` and
`eventType` before you conclude an action failed or succeeded.

## After the first deploy

The sequence above does not end at `deploy` — the app has a life afterwards,
and each part of it has a documented shape you should read before acting:

- **Moving to a newer SDK** is `deepspace app update`, not a hand-edited
  `package.json`. Run the **newest** CLI first —
  `npx deepspace@latest app update --json` — then follow its `steps`; it is a
  read-only guide and never rewrites the app for you. The updating guide
  (`/guides/updating`) is the sequence, and the CLI reference says what each
  field means. A scaffold older than server-minted ids refuses
  `app_not_registered` at every turn; its one remedy is
  `npx deepspace@latest app init --new-id`, which the guide explains.
- **Active apps consume a slot in your tier's quota.** A deploy or a fresh
  registration can be refused for that reason alone, and the remedy is a
  choice (free a slot or upgrade) — which is why that refusal ships no
  executable action. Surface it to the user; do not pick for them.
- **Connecting a domain you already own** is different from buying one. Read
  the custom-domains guide before either. Keep an externally registered domain
  at its registrar, use the supported external-domain attach/verify flow, and
  follow the returned DNS records. Prove ownership before claiming routing;
  never substitute an ad hoc reverse proxy or an internal registry write.
  Keep certificate-validation records needed for renewal, and verify the app
  through HTTPS on the custom hostname before calling the connection complete.
- **Taking an app down** is `deepspace app undeploy`. It is the most
  destructive app command and the docs state exactly what it removes and what
  survives. Read the app-identity guide before running it, and never run it
  to "clean up" without the user asking.

## Rules that prevent expensive mistakes

- Treat records as envelopes: fields are under `record.data`; `put(id, patch)`
  merges a partial value server-side.
- Disable write controls until `useMutations().ready`. Use a confirmed mutation
  when navigation, access changes, or a success message depends on acceptance.
- Data and auth hooks require the `(app)/` provider boundary. Top-level pages
  are static and must not call them.
- Keep the scaffold's required `users` schema. Extend it; do not rename it.
- App secrets belong in `deepspace secrets`, never hand-edited `.dev.vars`,
  shell environment prefixes, logs, commits, or screenshots.
- Caller identity comes only from a verified JWT. Never send identity in a
  WebSocket URL or client-controlled internal headers.
- A tool or server action that reads the `users` collection is not the same
  thing as the client roster, and the two do not project the same fields to
  the same people. Before exposing one to a model, a client, or a log, check
  the permissions docs for what that path returns and to whom — "it reads
  `users`" is not an answer.
- The local `ToastProvider` and UI primitives come from `src/components/ui`,
  not from the SDK.
- Treat scaffold themes and the starter home as placeholders. Give shipped
  apps their own design.
- Run apps on a supported Node line — the installation guide
  (`/get-started/installation`) is the authority on which lines those are.
