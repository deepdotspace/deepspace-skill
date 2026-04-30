# Skill description evals

Tooling to verify the `deepspace` skill description triggers reliably on relevant prompts and stays inert on near-misses. Adapted from the workflow in <https://agentskills.io/skill-creation/optimizing-descriptions>.

This directory is **for skill maintainers**, not part of the published skill.

## What's here

| File | Purpose |
|---|---|
| `train_queries.json` | 12 queries (6 should-trigger, 6 should-not-trigger). Used to identify failure modes when you're iterating on the description. |
| `validation_queries.json` | 8 held-out queries (4/4). Use **only after** you stop iterating, to check that improvements generalized. |
| `sanity_queries.json` | 5 fresh queries (3/2). Run after final selection to honest-check on prompts that were never part of the optimization process. |
| `run-eval.sh` | Runs each query 3× through `claude -p`, checks whether the Skill tool was invoked with `skill: "deepspace"`, computes per-query trigger rate, prints a pass/fail summary, exits non-zero if anything failed. |

## Running an eval

```bash
cd /Users/yukewu/Desktop/deepspace-skill/evals

# Iteration cycle: change the description, re-run train
./run-eval.sh train_queries.json

# Save results for diffing across iterations
./run-eval.sh train_queries.json > train-$(date +%Y%m%d-%H%M).json

# Once train is passing, check generalization
./run-eval.sh validation_queries.json

# Final honest-check
./run-eval.sh sanity_queries.json
```

20 queries × 3 runs at ~30s each is ~30 minutes per pass. Tune with env vars:

```bash
RUNS=5            ./run-eval.sh train_queries.json    # more confidence, slower
THRESHOLD=0.66    ./run-eval.sh ...                   # stricter pass bar (default 0.5)
SKILL_NAME=other  ./run-eval.sh ...                   # eval a different skill
```

## When to run

- **After any change to the `description:` field** in `skills/deepspace/SKILL.md`.
- **Quarterly**, even without changes — model behavior drifts as Claude versions roll forward.
- **After a major SDK rev** that adds new product surfaces (e.g., a new built-in feature category) — refresh the queries to reflect the wider scope, then re-eval.

## Reading the output

```
  [ 4/12] run 1/3 ... TRIGGERED
  [ 4/12] run 2/3 ... not triggered
  [ 4/12] run 3/3 ... TRIGGERED
  → PASS (rate=0.67, expected_trigger=true)
```

For each query: 3 runs, count how many invoked the skill. The pass rule:

- `should_trigger: true` query passes if rate ≥ threshold (default 0.5).
- `should_trigger: false` query passes if rate < threshold.

Final summary lists the failed queries. JSON results go to stdout; everything human-readable goes to stderr (so you can pipe stdout to `jq` for analysis).

## How to optimize when train fails

Per agentskills.io guidance — quoting the part that matters most:

> If should-trigger queries are failing, the description may be too narrow. Broaden the scope or add context about when the skill is useful.
>
> If should-not-trigger queries are false-triggering, the description may be too broad. Add specificity about what the skill does *not* do, or clarify the boundary between this skill and adjacent capabilities.
>
> Avoid adding specific keywords from failed queries — that's overfitting. Instead, find the general category or concept those queries represent and address that.

**Don't** look at validation results while iterating. Only consult validation after you stop changing the description, otherwise you've leaked the test set into training.

## Editing the query sets

Realistic prompts beat synthetic ones. When adding queries:

- Use file paths, casual language, occasional typos — match how users actually type.
- Include both should-trigger and should-not-trigger cases so the eval rewards precision, not just recall.
- The most useful **should-trigger** queries are those where the connection to the skill isn't obvious from the prompt alone. ("build a multiplayer X" is more discriminating than "build a deepspace app for X.")
- The most useful **should-not-trigger** queries are **near-misses** — same shape, different stack (Liveblocks, Socket.IO, Supabase, Convex, Pusher, plain Yjs). Avoid easy negatives like "what's the weather"; those test nothing.
- Each entry can include a `_rationale` field — ignored by the script, useful for the next maintainer.

## Output-quality testing

This eval covers **triggering only** — does the description match the right prompts?

For **output quality** — given the skill triggers, does it produce a working app? — use the published-path test described in `../yuke-findings-3.md` (or wherever your test prompts live). Run it in a fresh Claude Code session against the published `deepspace` and `create-deepspace` packages, read the agent's trace, look for: stale references the skill missed, places where the agent guessed instead of asked, cases where it skipped a Step 8 test the checklist required, etc. Combine: high trigger rate + clean output trace.

## Caveats

- `claude -p` cost: 60 invocations per train pass. Budget accordingly.
- The script counts an invocation only if `claude` returns valid JSON containing a `Skill` tool call with `input.skill == "deepspace"`. Network errors or sandbox refusals count as not-triggered.
- Trigger rate alone doesn't capture quality of the skill *use*. A 100% rate says only that the description fires correctly — it says nothing about whether the agent then does the right thing with the loaded skill.
