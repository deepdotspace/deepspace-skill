# Payments — subscriptions, one-time products, refunds, cancellation

Load this reference when adding subscriptions, one-time products, ad-hoc charges (tips/donations), free trials, refunds, or subscription cancellation to a DeepSpace app. Skip it for apps that don't charge money, or for Stripe Connect / developer-onboarding UI (that lives in the DeepSpace dashboard at `/earnings`, not in app code).

DeepSpace ships a Stripe-backed billing surface. The platform charges the customer; an admin transfers the developer's share to their connected account on demand. You do not write any Stripe code — you declare what you sell, then call SDK hooks and helpers.

**Developer onboarding (Connect) is handled in the DeepSpace dashboard `/earnings` page — not in app code. Apps can declare and sell before the dev connects; payouts wait until they do.**

## 1 — Declare what you sell

Two manifest files in the app, both synced by `deepspace deploy`:

### `src/subscriptions.ts` — recurring plans

```ts
export const subscriptionPlans = [
  { slug: 'free', name: 'Free', priceCents: 0 },
  {
    slug: 'pro',
    name: 'Pro',
    priceCents: 900,       // $9/mo — minimum $3/mo ($300)
    yearlyCents: 9000,     // optional; minimum $12/yr ($1200)
    trialDays: 7,          // optional free trial; max 90
    taxCode: 'txcd_10000000', // optional, defaults to digital services
  },
] as const
```

- Keep `slug` stable — subscribers reference it.
- `priceCents: 0` = free tier, never hits Stripe.
- Minimums exist because Stripe's per-charge fee ($0.30 + 2.9%) consumes sub-dollar charges.

### `src/products.ts` — one-time products

```ts
export const oneTimeProducts = [
  { productId: 'pro_unlock', name: 'Pro Unlock', amountCents: 1999, description: '…' },
] as const
```

- `productId` is the entitlement key. Use the same string in `useCheckout({ productId })`.
- Min `amountCents: 100`. Dropping a row deactivates it; existing purchases stay valid.

After editing either file: `deepspace deploy`. The CLI creates/updates Stripe Products + Prices and warns about grandfathered subscribers on price/slug changes.

## 2 — Subscriptions (recurring)

### Client: `useSubscription()`

```tsx
import { useSubscription } from 'deepspace'

function Paywall() {
  const sub = useSubscription()
  if (sub.isLoading) return null
  if (sub.isAtLeast('pro')) return <ProUI />
  return <button onClick={() => sub.subscribe('pro')}>Upgrade</button>
}
```

| Member | What it returns |
|---|---|
| `tier` | Current plan slug. Free-tier users return `'free'`. |
| `status` | `'none' \| 'trialing' \| 'active' \| 'past_due' \| 'canceled' \| …` |
| `entitled` | `true` iff status ∈ `{active, trialing}` (or free tier). |
| `hasTier(slug)` | Strict slug match **AND** entitled. |
| `isAtLeast(slug)` | Rank ≥ target slug **AND** entitled. |
| `interval` | `'month' \| 'year' \| null`. |
| `currentPeriodEnd`, `cancelAtPeriodEnd`, `trialEndsAt` | Read-only state. |
| `plans` | Plan catalog — pass straight to `<PricingTable plans={sub.plans} />`. |
| `subscribe(slug, { interval?, returnUrl?, cancelUrl? })` | Starts Checkout. Auto-redirects. |
| `openPortal(returnUrl?)` | Stripe Billing Portal for self-service (change card, cancel). |
| `refresh()` | Re-pull `/me`. |

**Gate on `hasTier`/`isAtLeast`, never on `tier` alone** — a `past_due` Pro user keeps `tier === 'pro'` while losing entitlement.

### Server: `requireSubscription`

```ts
import { requireSubscription, SubscriptionAuthError, SubscriptionRequiredError } from 'deepspace/server'

app.get('/api/premium', async (c) => {
  try {
    await requireSubscription(c, { atLeast: 'pro' }) // or { tier: 'pro' }
  } catch (e) {
    if (e instanceof SubscriptionAuthError)     return c.json({ error: 'unauthenticated' }, 401)
    if (e instanceof SubscriptionRequiredError) return c.json({ error: 'upgrade_required', required: e.required }, 402)
    throw e
  }
  // ... protected logic
})
```

The helper forwards the inbound `Authorization` header. The browser must attach it:

```ts
import { getAuthToken } from 'deepspace'
fetch('/api/premium', { headers: { Authorization: `Bearer ${await getAuthToken()}` } })
```

`getSubscription(c)` is the read-only variant returning the same shape.

## 3 — One-time products & ad-hoc charges

One hook, two modes:

```tsx
import { useCheckout } from 'deepspace'

// Product mode — entitlement-safe. Amount/name resolved server-side from products.ts.
const co = useCheckout({ productId: 'pro_unlock' })
if (co.owned) return <ProUI />
return <button onClick={() => co.chargeOnce({ productId: 'pro_unlock' })}>Buy</button>

// Ad-hoc mode — tips, donations. Caller picks amount.
co.chargeOnce({ amount: 500, name: 'Tip', description: '…' })
```

| Member | What it returns |
|---|---|
| `chargeOnce(opts)` | Starts Checkout. Auto-redirects. |
| `purchases` | Full purchase history. |
| `owned` | `true` iff the hook's `productId` was supplied **and** a non-refunded matching purchase exists. |
| `ownsProduct(id)` | Pure check over `purchases` for any productId. |
| `refresh()` | Re-pull purchase list. |

**Ad-hoc charges have `productId: null` and cannot be used to gate features** — use them for revenue collection only. Only product-mode charges are trustworthy with `owned`/`ownsProduct`.

## 4 — Cancellation (server)

```ts
import { cancelSubscription, CancelSubscriptionError } from 'deepspace/server'

// One user, end of current period (default):
await cancelSubscription(c, { userId: 'user_abc' })

// Everyone on a retired plan:
let res = await cancelSubscription(c, { planSlug: 'legacy_pro', atPeriodEnd: true })
while (res.hasMore) res = await cancelSubscription(c, { planSlug: 'legacy_pro' })
```

- Requires the inbound `Authorization` header (caller JWT). Platform verifies the JWT subject owns the app.
- Pass `atPeriodEnd: false` for an immediate cancel (handle refund separately if needed).
- Batched at 50; loop on `hasMore`. The flag is idempotent.
- Local state reconciles via Stripe webhook — read-back may lag a beat.

## 5 — Refunds (server)

```ts
import { refundInvoice, RefundError } from 'deepspace/server'

app.post('/api/admin/refund', requireMyAdmin, async (c) => {
  const r = await refundInvoice(c, {
    invoiceId,            // local UUID, NOT stripe inv_xxx
    amount: 500,          // optional partial in cents; full refund if omitted
    reason: 'requested_by_customer', // or 'duplicate' | 'fraudulent'
  })
  return c.json(r)
})
```

- Forwards caller JWT; platform rejects with `not_app_owner` (403) for non-owners. **Still gate the route in your own admin check.**
- Constraints: 90-day window from `paidAt`, 50/24h per app, no overdraw.
- Dashboard-initiated refunds reconcile automatically.

## 6 — Common recipes

**Free trial.** Add `trialDays: 7` to the plan in `subscriptions.ts`; redeploy. Customers see `status: 'trialing'`, `trialEndsAt` populated. `entitled` is `true` during trial.

**Annual toggle.** `sub.subscribe('pro', { interval: 'year' })` — Checkout uses the yearly price.

**Pricing table.** `<PricingTable plans={sub.plans} />` — already wired to the catalog.

**Custom return URLs.** All redirect-bound calls accept `{ returnUrl, cancelUrl }`; defaults to current page.

## 7 — Gotchas (read before shipping)

- **The browser must attach `Authorization: Bearer <jwt>` to every gated request.** The server helpers (`requireSubscription`, `refundInvoice`, `cancelSubscription`) read the JWT off the inbound request and forward it to the platform — they do not mint or fetch one themselves. If the browser fetch omits the header, the helper throws `SubscriptionAuthError` (HTTP 401). Wire it once in a fetch wrapper: `headers: { Authorization: 'Bearer ' + await getAuthToken() }`.

- **"Tier" and "entitled" are not the same thing — never gate on `tier` alone.** *Tier* = which plan slug the user signed up for (e.g. `'pro'`). *Entitled* = whether they currently have access to paid features. A user whose card just failed has `tier: 'pro'` **and** `status: 'past_due'` — recorded as Pro, but Stripe is retrying their card and they should not get access. The free tier is always entitled. Use `sub.hasTier('pro')` / `sub.isAtLeast('pro')`, which check both tier **and** status. A bare `sub.tier === 'pro'` check leaks paid features to past-due, canceled, and unpaid users.

- **Ad-hoc charges cannot be used to unlock features later.** Ad-hoc mode (`chargeOnce({ amount, name })`) creates a purchase row with `productId: null`, so there is no entitlement key to look up afterwards — `ownsProduct(id)` and `useCheckout({ productId }).owned` will never report true for ad-hoc payments. Use ad-hoc only when the value is the transaction itself (tips, donations, "name your price"). For anything that should grant durable access, declare a row in `src/products.ts` and use product mode (`chargeOnce({ productId })`).

- **Below-minimum prices are rejected at deploy time, not at runtime.** Minimums: $3/mo, $12/yr, $1.00 one-time. If a manifest entry is below these, `deepspace deploy` fails the sync step with an error and nothing is created on Stripe — Stripe's per-charge fee ($0.30 + 2.9%) would consume most of the charge and leave nothing for the developer. Raise the price or remove the plan.

- **Do not build any Stripe Connect / onboarding / bank-account UI in your app.** Connect onboarding is for the *developer* of the app, not the end-user — and it happens entirely in the DeepSpace dashboard at `/earnings`, outside the app. There is no SDK hook, component, or endpoint for it because no end-user ever sees it. **Your app can sync plans, run checkouts, and accept money before the developer has connected** — the funds accumulate on the platform balance, and an admin transfers them once the developer finishes onboarding in the dashboard.

- **The local subscription/purchase row reconciles ~1-2 seconds after Checkout returns.** When the customer comes back from Stripe Checkout to your `returnUrl`, the local row hasn't necessarily caught up yet — the platform updates it via a Stripe webhook fired moments later. Call `sub.refresh()` / `co.refresh()` once on return; if it still shows stale data, wait a beat and refresh again on a user action or short timeout. Avoid a tight `while` retry loop, which will race the webhook handler and spam the platform.

- **Never rename a plan's `slug` — change the `name` instead.** The `slug` is the stable identifier for existing subscribers, server-side gates (`isAtLeast('pro')`), and the underlying Stripe Product. Renaming a slug on the next deploy is interpreted as "delete old plan, create new plan" — existing subscribers stay billed on the old (now-orphaned) Stripe Price and the CLI will warn you and ask whether to cancel them at period end. For pure branding changes, edit the `name` field; the `slug` is for code, not for display.

- **Tax code is per-plan, not per-price.** A plan that offers both monthly and yearly uses one `taxCode` for both intervals. There is no way to set a different code per price; the sync route ignores any such attempt. If you need different tax treatment for different products, model them as separate plans (or separate one-time products).

## 8 — Surface map (file → purpose)

| File | What |
|---|---|
| `src/subscriptions.ts` | Plan manifest (synced on deploy). |
| `src/products.ts` | One-time product manifest. |
| `deepspace` (client) | `useSubscription`, `useCheckout`, `<PricingTable>`. |
| `deepspace/server` | `requireSubscription`, `getSubscription`, `refundInvoice`, `cancelSubscription`; error classes `SubscriptionRequiredError`, `SubscriptionAuthError`, `RefundError`, `CancelSubscriptionError`. |
