# DeepSpace Integrations Reference

Load this reference when calling an external API through `integration.post(...)` (LLMs, search, media, social, finance, etc.), debugging a `{ success: false, error: "..." }` envelope, looking up an endpoint's required body shape, or writing tests that mock integration calls. Skip it for app-internal data (use `useQuery` / `useMutations`).

All integrations are called through the api-worker proxy:

```typescript
import { integration } from 'deepspace'
const result = await integration.post('<integration-name>/<endpoint-name>', { ...params })
// Returns: { success: true, data: ... } or { success: false, error: "..." }
```

**Endpoint keys are two segments: `<integration>/<endpoint>`.** Use the exact names from `assets/integrations/index.yaml` — do not invent or paraphrase.

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

**The billing user is always the JWT subject.** End-user JWTs cannot redirect billing via headers — `/api/integrations/*` ignores `X-Billing-User-Id`, so the field cannot be used to charge a different DeepSpace account. The `developer` vs `user` flip in `src/integrations.ts` is the only billing knob.

For Google OAuth specifics (per-user billing, scope step-up, `requiresOAuth` retry), load `references/integrations/google-oauth.md` instead of fighting through the generic patterns here. For LiveKit audio/video rooms, load `references/integrations/livekit.md`.

## Testing — integration calls cost real money

`npx deepspace test` and `api.spec.ts` runs hit the real third-party API through the proxy — `developer`-billed calls charge the CLI user (`npx deepspace whoami`), `user`-billed calls charge the signed-in test account. Keep integration assertions minimal: one `integration.post(...)` per endpoint per test run, not a matrix. Never put integration calls inside `for` loops, retry-until-success polls, or parameterized test generators.

**Skip real `user`-billed endpoint calls in api.spec.ts.** Test accounts have no DeepSpace credits, so `user`-billed calls (e.g. `google/*`, or anything you've flipped to `'user'`) will 402 and the test will fail for the wrong reason. Don't "fix" this by temporarily flipping the integration to `'developer'` for tests — that silently bills the CLI user for calls the real app would have charged its end-users for, which is the opposite of what the developer chose.

For Google's OAuth surface specifically (mocking connected / `requiresOAuth` / Disconnect branches), see `references/integrations/google-oauth.md` § Testing.

## Endpoint catalog

Two ways to discover the catalog and per-endpoint contracts. Prefer the CLI — it returns the same data without burning context window.

### Preferred: `deepspace integrations` CLI (real-time, machine-readable)

The CLI is the agent-friendly source of truth — schemas come straight from the api-worker's Zod definitions and never go stale.

**Auth posture, by subcommand:**

| Command | Login required? | Network? | Notes |
|---|---|---|---|
| `deepspace integrations list` (= `invoke --list`) | **No** | Yes (catalog fetch) | Public catalog. Works on a fresh machine with no `~/.deepspace/session`. |
| `deepspace integrations info <ep>` (= `invoke <ep> --info`) | **No** | Yes (catalog fetch) | Same — schemas + example body without login. |
| `deepspace invoke <ep> --body` / `--body-file` | **Yes** (calls `ensureToken()`) | Yes | Actually calls the endpoint. Billed to the logged-in user. |

```bash
# Discovery — no login needed. Run these first when scoping integration work.
npx deepspace integrations list                          # human table
npx deepspace integrations list --json                   # machine-readable
npx deepspace integrations info <integration>/<endpoint> # schema + example body
npx deepspace integrations info <integration>/<endpoint> --json

# Actual calls — login required, billed to caller.
npx deepspace invoke openai/chat-completion --body '{"model":"claude-sonnet-4-5","messages":[...]}'
npx deepspace invoke openai/chat-completion --body-file req.json
cat req.json | npx deepspace invoke openai/chat-completion --body-file -
```

`deepspace invoke {--list, --info, <target> --body}` and `deepspace integrations {list, info, invoke}` are the same implementation under two parent names — pick whichever reads better in context.

**This closes the body-shape discovery gap** — instead of guessing `{ ticker }` vs `{ symbol }` vs `{ q }` and round-tripping through the live endpoint, run `info` and get the exact required keys + an example. **And because `list` / `info` skip auth, an agent on a fresh box (no `~/.deepspace/session`, no app dir, no dev server) can probe the catalog before deciding whether to ask the user to log in.**

### Fallback: YAML files in `assets/integrations/`

When the CLI isn't reachable (offline, sandboxed without network egress), the same data is bundled as YAML inside the skill itself. The skill is typically symlinked at `~/.claude/skills/deepspace/`, so the absolute path is `~/.claude/skills/deepspace/assets/integrations/`:

- Index: [`assets/integrations/index.yaml`](../../assets/integrations/index.yaml) — every endpoint grouped by integration, with one-line descriptions.
- Per-integration specs: [`assets/integrations/<name>.yaml`](../../assets/integrations/) — one file per integration, with full input/output schemas.

**Freshness caveat.** The bundle is hand-maintained — when the SDK adds a new integration, both the index and a new `<name>.yaml` need a manual regen. The skill aims to keep the bundle in sync with the live catalog (`integrations list`) at every release, but if you see a mismatch between what `integrations list` returns and what's on disk, the live CLI is the source of truth and you should `integrations info <ep>` (still no auth) to get the schema.

Call pattern is always POST: `integration.post('<integration>/<endpoint>', body)`.

**How to navigate these files to save context — read one level at a time.** The index covers every endpoint and the per-integration YAMLs can each be hundreds of lines; loading them speculatively wastes the window.

1. **Use `assets/integrations/index.yaml` only to discover** which integration and endpoint name matches the task (search by description, then grab the exact `<integration>/<endpoint>` key). Do not keep the index loaded after you have the names.
2. **Load exactly one `assets/integrations/<name>.yaml`** — the single file covering the endpoint you're about to call — for the required body shape and output schema. Do not load multiple integration files at once.
3. **If the app calls endpoints from several integrations, load them one at a time** as you reach each call site. The body/response shape of `openweathermap` has nothing to teach you about `exa`.
4. **Do not load any integration YAML** for apps that don't call `integration.post(...)` at all — client-only apps with hooks and RBAC never need this directory.

## Response format

All endpoints return:

```typescript
{ success: true, data: <endpoint-specific> } | { success: false, error: string }
```

`data` shape varies by endpoint. Common pattern: `data` is the raw upstream response (often an array for list endpoints, object for detail endpoints). Do not assume nested keys like `data.list` or `data.results` without verifying — check `Array.isArray(result.data)` first.

**Empty-response gotcha:** some endpoints return `success: true` with empty or zero-filled data instead of an error when the upstream has no matches — notably `finnhub/stock-price` (all-zero quote) and `alphavantage/search-symbols` (`{ bestMatches: [] }`). Check for the empty state explicitly in addition to `success`.
