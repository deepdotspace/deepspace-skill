# DeepSpace Integrations Reference

All integrations are called through the api-worker proxy:

```typescript
import { integration } from 'deepspace'
const result = await integration.post('<integration-name>/<endpoint-name>', { ...params })
// Returns: { success: true, data: ... } or { success: false, error: "..." }
```

**Endpoint keys are two segments: `<integration>/<endpoint>`.** Use the exact names from `integrations.yaml` — do not invent or paraphrase.

**Body shapes** — full optional-parameter coverage (enum values, ranges, defaults) lives in the api-worker's Zod schema (mirrored in `integrations/<name>.yaml`). A wrong body just returns `{ success: false, error: "..." }` in the envelope, so the fast path is: try the required shape, then widen with optionals as needed.

## Billing & access control

The scaffold's `src/integrations.ts` defaults every integration to `billing: 'developer'` — the app owner pays. This is intentional: end-users of a deployed app shouldn't have to create a DeepSpace account or hand over a card just to use features that hit external APIs. The trade-off is that the integration proxy also lets **anonymous callers** through for `developer`-billed endpoints, so without a UI gate any visitor (or a bot finding the deployed URL) can fire `integration.post(...)` and the owner pays.

**Default rule: auth-gate any UI surface that triggers `integration.post(...)`.** Wrap the calling page or button behind `useAuth().isSignedIn`. The owner still pays — that's the model — but the surface is limited to signed-in users you can identify, count, and rate-limit per your app's own logic. Anonymous bots are stopped at the sign-in wall.

**Alternative for explicit user-pays apps: `billing: 'user'`.** If callers (not the owner) should pay, flip the integration in `src/integrations.ts`:

```ts
export const integrations: Record<string, { billing: 'developer' | 'user' }> = {
  google: { billing: 'user' },   // already in scaffold — required for OAuth
  // openai: { billing: 'user' },
}
```

The api-worker then 401s anonymous callers and bills the signed-in user's DeepSpace credits. This is enforced server-side, so it holds even if the UI gate is bypassed — but it does require every end-user to have a DeepSpace account with credits, which is usually only appropriate when each user has an obvious one-to-one relationship with their own costs (and you've told them so up front).

For Google OAuth specifics (per-user billing, scope step-up, `requiresOAuth` retry), load `references/integrations/google-oauth.md` instead of fighting through the generic patterns here. For LiveKit audio/video rooms, load `references/integrations/livekit.md`.

## Testing — integration calls cost real money

`npx deepspace test` and `api.spec.ts` runs hit the real third-party API through the proxy — `developer`-billed calls charge the CLI user (`npx deepspace whoami`), `user`-billed calls charge the signed-in test account. Keep integration assertions minimal: one `integration.post(...)` per endpoint per test run, not a matrix. Never put integration calls inside `for` loops, retry-until-success polls, or parameterized test generators.

**Skip real `user`-billed endpoint calls in api.spec.ts.** Test accounts have no DeepSpace credits, so `user`-billed calls (e.g. `google/*`, or anything you've flipped to `'user'`) will 402 and the test will fail for the wrong reason. Don't "fix" this by temporarily flipping the integration to `'developer'` for tests — that silently bills the CLI user for calls the real app would have charged its end-users for, which is the opposite of what the developer chose.

For Google's OAuth surface specifically (mocking connected / `requiresOAuth` / Disconnect branches), see `references/integrations/google-oauth.md` § Testing.

## Endpoint catalog

Full endpoint specs — input schemas, descriptions, output schemas — live in YAML:

- Index: [`integrations.yaml`](./integrations.yaml) — all 215 endpoints grouped by integration, with one-line descriptions.
- Per-integration specs: [`integrations/<name>.yaml`](./integrations/) — one file per integration (31 total), with full input/output schemas.

Call pattern is always POST: `integration.post('<integration>/<endpoint>', body)`.

**How to navigate these files to save context — read one level at a time.** The index is large (all 215 endpoints) and the per-integration YAMLs can each be hundreds of lines; loading them speculatively wastes the window.

1. **Use `integrations.yaml` only to discover** which integration and endpoint name matches the task (search by description, then grab the exact `<integration>/<endpoint>` key). Do not keep the index loaded after you have the names.
2. **Load exactly one `integrations/<name>.yaml`** — the single file covering the endpoint you're about to call — for the required body shape and output schema. Do not load multiple integration files at once.
3. **If the app calls endpoints from several integrations, load them one at a time** as you reach each call site. The body/response shape of `openweathermap` has nothing to teach you about `exa`.
4. **Do not load any integration YAML** for apps that don't call `integration.post(...)` at all — client-only apps with hooks and RBAC never need this directory.

## Response format

All endpoints return:

```typescript
{ success: true, data: <endpoint-specific> } | { success: false, error: string }
```

`data` shape varies by endpoint. Common pattern: `data` is the raw upstream response (often an array for list endpoints, object for detail endpoints). Do not assume nested keys like `data.list` or `data.results` without verifying — check `Array.isArray(result.data)` first.

**Empty-response gotcha:** some endpoints return `success: true` with empty or zero-filled data instead of an error when the upstream has no matches — notably `finnhub/stock-price` (all-zero quote) and `alphavantage/search-symbols` (`{ bestMatches: [] }`). Check for the empty state explicitly in addition to `success`.
