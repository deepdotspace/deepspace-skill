_Load this reference when adding teammates to an app, deploying an app you don't own, or debugging a 403 on deploy/secrets as a non-owner._

# App collaborators

Collaborators are DeepSpace users the app **owner** authorizes to work on the app. Ownership never moves: the deployed worker keeps the owner's identity, billing, and `APP_OWNER_JWT`. Authorization keys to the app's immutable `DEEPSPACE_APP_ID` (→ [references/app-identity.md](app-identity.md)) — there is no per-resource grant or link step.

> **Not the same thing:** record-level collaborators (`collaboratorsField` in a schema, the `'shared'` read rule) control who sees *rows inside* an app → `references/schemas.md`. This file is about who can *ship* the app.

## Managing (owner-only)

```bash
npx deepspace collaborators list                         # emails; --json for user ids
npx deepspace collaborators add teammate@example.com     # must already be a DeepSpace user
npx deepspace collaborators remove teammate@example.com
```

Run from the app checkout (or pass `--app <id or name>`). Test accounts (`…@deepspace.test`) can never be collaborators — grants to them fail closed. Collaborators get owner-equivalent deploy and secrets access, so only add people you trust.

## What a collaborator can and can't do

| Action | Allowed? |
|---|---|
| `deploy` (incl. `--env`) | **Yes** — on-behalf; CLI prints `Deployed on behalf of owner <id>`; billing stays the owner's |
| `dev` / `test` | **Yes** |
| Secrets: `list` / `get` / `download` / `pull` | **Yes** — every config in the app's store |
| Secrets: `set` / `upload` / `delete`, `configs create` / `delete` | **Yes** — writes are audited under the collaborator's own id |
| `undeploy` | No — owner (or platform admin) only |
| `transfer` | No — owner-only (→ `references/app-identity.md`) |
| `collaborators add` / `remove` | No — owner-only |

## Mechanics and traps

- **Access is the app role.** Every deploy/secrets request is authorized against the app id: owner, collaborator, or neither. A 403 `Not the app owner or a collaborator` means ask the owner for `collaborators add` — or your access was revoked.
- **On-behalf deploys keep the owner's identity.** A collaborator deploy ships code plus the store's secrets, tagged to the owner for billing; nothing about the app's ownership changes.
- **Getting started as a collaborator:** clone the repo (its `wrangler.toml` already carries `DEEPSPACE_APP_ID`), `npx deepspace login`, and `dev` / `test` / `deploy` / `secrets` just work — no linking. If you actually wanted your **own** copy of the app rather than to collaborate, run `npx deepspace init --new-id` to fork it (fresh data, fresh secrets store).
