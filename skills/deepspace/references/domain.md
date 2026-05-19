# Custom Domains — buy, attach, manage

Load this reference when a user asks to point a real domain (e.g., `myapp.com`) at a deployed DeepSpace app, when extending or scripting the `deepspace domain` CLI from an agent, or when debugging "the domain bought but nothing resolves yet" issues. Skip it for apps that are happy on `<name>.app.space`.

The `deepspace domain` CLI is **agent-friendly by design** — destructive commands take `--yes` to skip prompts, most read commands take `--json` for structured stdout (`search`, `buy`, `list`, `status`, `attach` — `detach` and `renew` do not), and `--app` defaults to the current `wrangler.toml`'s `name` field (matches `deepspace deploy`).

## Model

- **Registrar:** hybrid Cloudflare Registrar (~27 TLDs at-cost) + Porkbun (`.ai`, `.io`, `.me`, `.co`, ccTLDs, etc.). The CLI hides the choice — `search` results show the price; `buy` picks the right registrar automatically. The `registrar` field on each result is `'cloudflare' | 'namesilo'` — the `'namesilo'` literal is the historical name for the non-CF path; the actual upstream registrar is Porkbun. Treat the type's `'namesilo'` value as "non-CF" rather than literally NameSilo.
- **Routing:** Cloudflare Custom Hostnames against the platform's single SaaS zone (`app.space`). After purchase, the platform provisions DCV + ownership records on the new domain's zone, then activates a hostname route at the platform.
- **Billing:** Stripe Checkout opens in a browser at the user's machine. Auto-renew is on by default; toggle off with `domain renew <d> --auto off`. Pricing fields on the API are `chargedCents` (per-year price shown in CLI output) plus separate `pricing.registrationCost` / `pricing.renewalCost` strings — they are usually equal but can differ for premium domains.
- **Time to live — varies sharply by registrar:**
  - **Cloudflare Registrar TLDs** (`.com`, `.dev`, `.app`, `.xyz`, etc.): ~60–90 seconds. The registry publishes Cloudflare nameservers atomically with registration. The CLI's polling deadline is 5 minutes.
  - **Porkbun TLDs** (`.ai`, `.io`, `.me`, `.co`, ccTLDs): 15–60 minutes — the wait is registry-side NS propagation, not platform-side. The CLI's polling deadline is 60 minutes.

  Either way, you can Ctrl-C out of the polling loop without losing progress — provisioning continues server-side. Re-check with `domain status <domain>`.

## Subcommands

```bash
# Find available domains and prices
npx deepspace domain search <query>              # human table
npx deepspace domain search <query> --json       # machine-readable
npx deepspace domain search <query> --limit 25

# Buy a domain via Stripe Checkout (browser opens)
npx deepspace domain buy <domain>                          # opens browser, polls until live
npx deepspace domain buy <domain> --app <name> --yes       # skip the "are you sure" prompt
npx deepspace domain buy <domain> --no-open                # print the Stripe URL instead of opening
npx deepspace domain buy <domain> --no-wait                # exit after Checkout session is created
npx deepspace domain buy <domain> --json                   # JSON to stdout (combine with --no-wait for headless)

# List domains you own
npx deepspace domain list
npx deepspace domain list --json

# Detail view for one domain — registrar status, hostname status, expiry, errors
npx deepspace domain status <domain>
npx deepspace domain status <domain> --json

# Re-point a domain at a different app (or the same app, e.g., after a rename)
npx deepspace domain attach <domain> --app <new-app-name>
npx deepspace domain attach <domain> --app <new-app-name> --json

# Stop routing the domain (keeps the registration; user keeps owning it; auto-renew unchanged)
npx deepspace domain detach <domain> --yes

# Toggle auto-renew at the registrar
npx deepspace domain renew <domain> --auto on
npx deepspace domain renew <domain> --auto off
```

## When the agent should pause and tell the user

`deepspace domain buy` opens a Stripe Checkout tab. The user must complete payment in the browser before the CLI's polling can succeed. Two rules:

1. **Tell the user a payment is required before running `buy`** — the same way the skill treats interactive `login`. They need to be at the keyboard.
2. **Don't wrap `buy` in `timeout N` or any cutoff.** The CLI polls for **5 minutes on Cloudflare-registered TLDs** and **60 minutes on Porkbun TLDs** — an artificial cutoff aborts before payment + provisioning finish. Use `--no-wait` if you genuinely want a fire-and-forget mode (you'll need to call `domain status` later). Even without `--no-wait`, Ctrl-C is safe — provisioning continues server-side regardless.

For non-interactive CI, prefer `domain attach` (re-pointing an already-bought domain) over `buy`. Buying inherently needs a human at a card form.

## Defaults that bite

- **`--app` defaults to `./wrangler.toml`'s `name` field.** If you run `deepspace domain buy myapp.com` outside an app dir without `--app`, the CLI errors with `No app specified. Pass --app <name>, or run from an app directory with a wrangler.toml.` Stay inside the app directory or pass `--app` explicitly.
- **Renewal price is usually but not always equal to registration price.** `chargedCents` in `list` / `status` output is the price you paid this year. The pricing object exposes separate `registrationCost` / `renewalCost`; for non-premium TLDs they match, but premium domains can have introductory pricing that resets at renewal — read `domain status` output before assuming.
- **Detach is reversible; releasing the registration is not.** `detach` only stops routing (`DELETE /api/domains/:id` keeps the registration on file). The user keeps owning the domain and can re-attach later, or stop auto-renew with `renew --auto off`. There is no `domain release` / `domain transfer` subcommand — registrar-side transfers go through the registrar's own portal.
- **Non-TTY safety on `confirm`.** `domain buy` and `domain detach` refuse to run without `--yes` when stdin isn't a TTY (piped, agent context). The error message is explicit: `… — pass --yes to confirm non-interactively`. Always include `--yes` when invoking from a script or agent.

## Test pattern

`domain attach` is the only routinely-automatable command — and even then, you need a domain you've already bought to test against, since `buy` is not safe to put in CI (real charges, real registry side-effects).

**Endpoints live on the api-worker, not the app worker.** The CLI talks to `https://api-worker.deep.space` directly — the scaffolded app worker does not proxy `/api/domains/*`. Tests need to point at that api-worker URL directly.

The reattach endpoint is `POST /api/domains/:id/reattach` — the path id is the database `id` from `list` output, **not** the domain string:

```typescript
const API_URL = 'https://api-worker.deep.space'

test('domain attach moves the route to the target app', async ({ request }) => {
  const token = /* read from ~/.deepspace/token or via your test helper */

  // Pre-condition: a domain you already own — discover its id via list.
  const listRes = await request.get(`${API_URL}/api/domains`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const list = await listRes.json() as { domains: Array<{ id: string; domain: string }> }
  const target = list.domains.find(d => d.domain === 'test-fixture.xyz')
  if (!target) test.skip(true, 'no test-fixture domain in account')

  const res = await request.post(`${API_URL}/api/domains/${target.id}/reattach`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { appName: 'target-app' },
  })
  expect(res.status()).toBe(200)
  // Optionally: curl the test domain and assert the response comes from `target-app`.
})
```

`buy` and `renew` are not safe to put in automated tests — `buy` charges real money, `renew --auto on/off` changes billing posture for the registered domain. Use `--json --no-wait` on `buy` only in interactive flows where the user has just confirmed payment.

## See also

- `references/architecture.md` — for how custom hostnames route into the same dispatch worker that handles `<name>.app.space` apps.
- The `wrangler.toml` `name` field is the link between every CLI command and the app — `domain attach --app <X>` writes a hostname-map entry keyed on `X`, which must match the deployed worker's `name`. Renaming the app post-deploy without re-deploying breaks domain routing.
