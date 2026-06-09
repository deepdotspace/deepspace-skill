# `assets/integrations/` — endpoint catalog

Hand-maintained YAML catalog of every endpoint exposed by the DeepSpace api-worker integration proxy. The skill body cross-references these files when a task involves `integration.post(...)`; agents normally reach them via the CLI (`npx deepspace integrations list / info`, `npx deepspace invoke --list / --info`) which prints the same data in JSON without burning context window.

## File layout

- `index.yaml` — flat catalog: every endpoint key + a one-line description. Use this to confirm a name exists or to look one up by topic. Includes `integration_count`, `endpoint_count`, `oauth_required_integrations`, and a `categories.<name>` block per integration with each endpoint's key + description.
- `<integration>.yaml` (one per integration, 29 files) — full per-endpoint detail: HTTP method, endpoint key, description, input Zod schema (the same one the api-worker validates against), and any auth / billing notes.

Load `index.yaml` first to confirm an endpoint name. Drill into `<integration>.yaml` only when the body shape is non-obvious or when `npx deepspace invoke <ep> --info` isn't an option (no network, agent in a closed sandbox, etc.).

## Per-endpoint schema

Each entry under `tools.<endpoint-suffix>:` carries:

| Key | Meaning |
|---|---|
| `method` | HTTP method the api-worker expects (currently always `POST`). |
| `endpoint_key` | The two-segment name you pass to `integration.post(<endpoint_key>, body)`. |
| `description` | One-sentence summary — same string `--info` prints. |
| `input_schema` | JSON-Schema-style representation of the Zod input the api-worker validates. `required`, `enum`, `default`, `minimum`, `maximum`, `additionalProperties` all show up as you'd expect. |
| `output_schema` (when present) | Shape of the `data` field on a `success: true` envelope. |
| `oauth` (when present) | `true` for OAuth-required endpoints (currently the `google/*` family). |

## Wire envelope

Every endpoint returns:

```ts
{ success: true,  data: <endpoint-specific> }
{ success: false, error: string, issues?: Array<{ path?, message, code? }> }
```

The `issues` array is the Zod validator's diff against `input_schema` — read it before adjusting the body.

## When this catalog drifts

The YAMLs are hand-maintained from the api-worker's actual route handlers; the CLI (`integrations list`) reads its own runtime catalog over the network and is always live. If a CLI lookup disagrees with the YAML, the CLI is right — open an issue, then check `node_modules/deepspace/dist/...` for the canonical shape.

## Don't ship these files in the deployed app

These YAMLs are skill metadata — they exist so an agent can reason about endpoints without round-tripping the CLI. They aren't required at runtime in a scaffolded app, and they aren't installed by `npm create deepspace`. The skill bundles them only because the skill loads from `~/.claude/skills/deepspace/` and the path-prefixed reference (`assets/integrations/index.yaml` in skill body) needs them physically present.
