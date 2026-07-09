_Load this reference when adding teammates to an app, deploying an app you don't own, or debugging a 403 on deploy/secrets as a non-owner._

# App collaborators

Collaborators are DeepSpace users the app **owner** authorizes to deploy the app on the owner's behalf. Ownership never moves: the deployed worker keeps the owner's identity, billing, and `APP_OWNER_JWT`.

> **Not the same thing:** record-level collaborators (`collaboratorsField` in a schema, the `'shared'` read rule) control who sees *rows inside* an app → `references/schemas.md`. This file is about who can *ship* the app.

## Managing (owner-only)

```bash
npx deepspace collaborators list
npx deepspace collaborators add teammate@example.com     # must already be a DeepSpace user
npx deepspace collaborators remove teammate@example.com
```

Run from the app checkout (or pass `--app <name>`). Test accounts (`…@deepspace.test`) can never be collaborators — grants to them fail closed.

## What a collaborator can and can't do

| Action | Allowed? |
|---|---|
| `deploy` (incl. `--env`) | **Yes** — on-behalf; CLI prints `Deployed on behalf of owner <id>` |
| `undeploy` | No — owner (or platform admin) only |
| Secrets: read / `pull` / `list` / `get` / `download` in the app's linked project | **Yes**, every config in that project |
| Secrets: `set` / `upload` / `delete` | **Yes** — writes are audited under the collaborator's own id |
| `configs create` / `clone` / `delete` in the linked project | **Yes** |
| Create a **new/missing** secrets project | No — 403 `Collaborators cannot create missing secrets projects` |
| Change which project the app links to (server-side link) | No — owner-only; a collaborator's `secrets setup` writes the local `wrangler.toml` link only |
| `collaborators add` / `remove` | No — owner-only |

## Mechanics and traps

- **Access rides the app link.** Collaborator secrets requests are scoped to the app (the CLI adds this automatically when run from a checkout whose link matches), and the platform grants access only if the **owner's** app registry entry links that project. Until the owner has linked + deployed, collaborators get `secrets_project_not_linked` (403).
- **On-behalf deploys don't touch the secrets link.** A collaborator deploy ships code and refreshed linked secrets but never re-points the app at a different project.
- **Secrets access is project-wide, not config-scoped.** A collaborator on the app can read/write *every* config in the linked project — including one the owner shares with another app. Keep one project per app unless that sharing is intended.
- **Getting started as a collaborator:** clone the repo, `npx deepspace login`, then `dev` / `test` / `deploy` work as usual. If `wrangler.toml` lacks the secrets link vars, run `npx deepspace secrets setup --project <owners-project>` to link locally (the server link is already the owner's).
