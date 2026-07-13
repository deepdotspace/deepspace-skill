_Load this reference when working with app ids (`DEEPSPACE_APP_ID`), forking a cloned repo (`init --new-id`), renaming an app, listing your apps (`apps`), undeploying, or transferring ownership._

# App identity: ids, names, renames, transfers

Every app has an **immutable id** (`app_` + 26 chars) minted when the app is created, living in `wrangler.toml`:

```toml
[vars]
DEEPSPACE_APP_ID = "app_01HZXYABCDEFGHJKMNPQRSTVWX"
```

The id **is** the app: data, secrets, collaborators, billing, and custom domains all key to it. The `name` field is just a lease on `<name>.app.space` — it can change without the app losing anything. **Commit `wrangler.toml`**: the id is not a secret, and losing it means the next deploy creates a *different* app.

## Where ids come from

- `npm create deepspace` mints one into the scaffold.
- `deepspace deploy` in a repo without one mints it on the spot and writes it to `wrangler.toml` (commit that change).
- `deepspace init` stamps one into an existing repo explicitly; `deepspace init --new-id` **forks**: same code, brand-new app — fresh data, fresh secrets store, fresh URL; the original app is untouched. Use it when you clone another app's repo and want your own. A deploy or secrets write failing with *"This app id is registered to another user"* means run it.
- Each `[env.<name>]` block is its **own app** with its own id (`init --env <name>`, or minted on that env's first deploy).

## Renames

Change `name` in `wrangler.toml` and deploy; the CLI asks you to confirm (or pass `--rename`). The new URL serves immediately and the old one stops; data, secrets, collaborators, and custom domains follow the id, untouched. The old name stays reserved for you for **30 days** while links drain, then frees up.

## Listing, undeploy, revival

```bash
npx deepspace apps                    # every app registered to you: id, URL, deploy state (--json)
npx deepspace undeploy [--env <name>] # off the network; deletes stored data
```

`undeploy` deletes the app's stored data but the id survives — deploying again revives the same app (same collaborators, same secrets store), and within 30 days the old name is still yours. Active (deployed) apps count against your tier's cap; undeployed ones don't, and revival is quota-checked like a fresh deploy. `apps` is the answer to "which app do I undeploy?" when a quota message names an id you've lost track of.

## Ownership transfer

GitHub-style two-step handshake — nothing changes until the recipient accepts:

```bash
# Owner:
npx deepspace transfer offer teammate@acme.com   # 7-day offer; --replace swaps a pending one
npx deepspace transfer status
npx deepspace transfer cancel

# Recipient:
npx deepspace transfer accept --app app_01HZ…    # commit — they own it now
```

On acceptance the app — data, secrets, routes, custom domains — moves as-is; only the owner (and billing) changes. Tell the recipient the app id; there is no in-product notification. Collaborators cannot transfer (or undeploy) — that stays with the owner. → [references/collaborators.md](collaborators.md)
