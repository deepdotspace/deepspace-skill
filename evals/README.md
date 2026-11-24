# Skill description evals

Verifies the `deepspace` skill description triggers on relevant prompts and
stays inert on near-misses. Maintainer tooling — not part of the published
skill. This eval covers triggering only.

| File | Purpose |
|---|---|
| `train_queries.json` | 19 queries (9 should-trigger, 10 should-not). Iterate against this. |
| `validation_queries.json` | 16 held-out queries (9/7). Run only after you stop iterating. |
| `sanity_queries.json` | 6 fresh queries (3/3). Final honest check; never optimize against it. |

`run-eval.sh` runs each query several times through `claude -p`, checks
whether the Skill tool fired with `skill: "deepspace"`, and exits non-zero on
any failure (its header comment documents the knobs).

```bash
cd evals
./run-eval.sh train_queries.json
./run-eval.sh validation_queries.json   # once train passes
./run-eval.sh sanity_queries.json       # final check
```

A should-trigger query passing every run and a should-not query never
triggering is the pass bar. If the description changes, re-run all three
sets before publishing.
