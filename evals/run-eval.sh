#!/usr/bin/env bash
#
# run-eval.sh — measure deepspace skill trigger rate against a query set.
#
# Usage:
#   ./run-eval.sh train_queries.json
#   ./run-eval.sh validation_queries.json
#   ./run-eval.sh sanity_queries.json
#
#   RUNS=5 ./run-eval.sh train_queries.json        # change runs per query
#   THRESHOLD=0.66 ./run-eval.sh ...               # change pass threshold
#   SKILL_NAME=deepspace ./run-eval.sh ...         # match a different skill name
#
# Outputs a JSON array of per-query results to stdout. Human-readable summary
# (progress + final pass/fail breakdown) goes to stderr so you can pipe stdout
# to `jq` or save to a file:
#
#   ./run-eval.sh train_queries.json > results-$(date +%Y%m%d).json
#
# Adapted from the script in https://agentskills.io/skill-creation/optimizing-descriptions

set -uo pipefail

QUERIES_FILE="${1:-}"
if [[ -z "$QUERIES_FILE" || ! -f "$QUERIES_FILE" ]]; then
  echo "Usage: $0 <queries.json>" >&2
  echo "Example: $0 train_queries.json" >&2
  exit 1
fi

SKILL_NAME="${SKILL_NAME:-deepspace}"
RUNS="${RUNS:-3}"
THRESHOLD="${THRESHOLD:-0.5}"

command -v claude >/dev/null 2>&1 || { echo "claude (Claude Code) not found in PATH" >&2; exit 1; }
command -v jq     >/dev/null 2>&1 || { echo "jq not found in PATH" >&2; exit 1; }

# check_triggered: returns 0 if claude invoked the Skill tool with input.skill == $SKILL_NAME
# during the response, 1 otherwise. Errors (network, timeout) count as not-triggered.
check_triggered() {
  local query="$1"
  claude -p "$query" --output-format json 2>/dev/null \
    | jq -e --arg skill "$SKILL_NAME" \
        'any(.messages[].content[]?; .type == "tool_use" and .name == "Skill" and .input.skill == $skill)' \
        > /dev/null 2>&1
}

count=$(jq length "$QUERIES_FILE")
echo "Running $count queries × $RUNS runs against skill='$SKILL_NAME' (threshold=$THRESHOLD)" >&2
echo "" >&2

results=()
pass_count=0
fail_count=0

for i in $(seq 0 $((count - 1))); do
  query=$(jq -r ".[$i].query" "$QUERIES_FILE")
  should_trigger=$(jq -r ".[$i].should_trigger" "$QUERIES_FILE")
  triggers=0

  for run in $(seq 1 "$RUNS"); do
    printf "  [%2d/%d] run %d/%d ... " "$((i + 1))" "$count" "$run" "$RUNS" >&2
    if check_triggered "$query"; then
      triggers=$((triggers + 1))
      printf "TRIGGERED\n" >&2
    else
      printf "not triggered\n" >&2
    fi
  done

  trigger_rate=$(echo "scale=4; $triggers / $RUNS" | bc)
  # Pass logic: should_trigger==true requires rate >= threshold; should_trigger==false requires rate < threshold.
  passed=$(jq -n --argjson should "$should_trigger" --argjson rate "$trigger_rate" --argjson t "$THRESHOLD" \
              'if $should then ($rate >= $t) else ($rate < $t) end')

  result=$(jq -n \
    --arg query "$query" \
    --argjson should_trigger "$should_trigger" \
    --argjson triggers "$triggers" \
    --argjson runs "$RUNS" \
    --argjson trigger_rate "$trigger_rate" \
    --argjson passed "$passed" \
    '{query: $query, should_trigger: $should_trigger, triggers: $triggers, runs: $runs, trigger_rate: $trigger_rate, passed: $passed}')

  results+=("$result")

  if [[ "$passed" == "true" ]]; then
    pass_count=$((pass_count + 1))
    printf "  → PASS (rate=%.2f, expected_trigger=%s)\n\n" "$trigger_rate" "$should_trigger" >&2
  else
    fail_count=$((fail_count + 1))
    printf "  → FAIL (rate=%.2f, expected_trigger=%s)\n\n" "$trigger_rate" "$should_trigger" >&2
  fi
done

# Print full JSON results to stdout
printf '%s\n' "${results[@]}" | jq -s '.'

# Summary to stderr
total=$((pass_count + fail_count))
pass_pct=$(echo "scale=1; 100 * $pass_count / $total" | bc)

echo "" >&2
echo "──────────────────────────────────────────────" >&2
echo "  Total: $total   Pass: $pass_count   Fail: $fail_count   ($pass_pct%)" >&2
echo "──────────────────────────────────────────────" >&2

if [[ $fail_count -gt 0 ]]; then
  echo "" >&2
  echo "Failed queries:" >&2
  printf '%s\n' "${results[@]}" \
    | jq -r 'select(.passed == false) | "  [\(if .should_trigger then "should-trigger " else "should-NOT     " end)] rate=\(.trigger_rate) — \(.query)"' \
    >&2
fi

# Exit non-zero if any failures, so this can gate CI / pre-commit if you want
[[ $fail_count -eq 0 ]]
