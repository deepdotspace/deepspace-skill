# Jobs — durable background work

Load this reference when adding a background job (AI generation, export, render, bulk import, fan-out side effect), wiring an enqueue path from a client button or worker HTTP route, building anything that needs to outlive the HTTP response, or debugging "why did my long job die when the response went out" / "Cloudflare killed my `ctx.waitUntil` after 30 seconds." Skip it for work that finishes inside the HTTP handler (use a regular Hono route) or runs on a schedule (use `references/cron.md`).

## Architecture

The scaffold ships a per-app `AppJobRoom extends JobRoom` DO; handlers live in `src/jobs.ts` and run on the DO's alarm (15-min wall budget per tick, chained for longer jobs). Jobs are durable in the DO's SQLite, survive isolate restarts, and broadcast every state change over WebSocket so clients see live progress without polling. There is **no `ctx.waitUntil` fire-and-forget pattern** — that path is killed 30s after the response and is the bug this room replaces.

State machine: `queued → running → succeeded | failed | canceled`. Crash recovery on the next DO wake-up rescues rows stuck `running` past ~16 min (retries them if attempts remain, otherwise marks failed).

## Define handlers in `src/jobs.ts`

```typescript
import type { Job, JobContext } from 'deepspace/worker'

export async function runJob(job: Job, ctx: JobContext, env: Env): Promise<unknown | void> {
  if (job.type === 'ai-summarize') {
    const { text } = job.payload as { text: string }
    ctx.progress(0.1, 'starting')
    // Pass ctx.signal so Cancel actually aborts the upstream fetch.
    const summary = await callModel(text, { signal: ctx.signal })
    return { summary, words: summary.split(/\s+/).length }
  }

  if (job.type === 'export-csv') {
    // ... long export, call ctx.progress(p, msg) periodically
  }

  // Default: unknown type → fail loudly so it shows up in the failed list.
  throw new Error(`Unknown job type: ${job.type}`)
}
```

> **API-shape gotcha** — `runJob` returns the *result value*, not a job state object. Throw to fail. `ctx.progress(0..1, msg?)` broadcasts progress; `ctx.signal` is an AbortSignal that fires on client cancel; `ctx.continue(state, { afterMs? })` checkpoints and yields to the next alarm tick (use for jobs that exceed 15 min). There is no `ctx.complete()` or `ctx.fail()` — the return / throw flow controls outcome.

## Job lifecycle rules

- **Return value → `job.result`** (must be JSON-serializable). Throw → `job.error` + retry if `attempts < maxAttempts`.
- **`maxAttempts`** defaults to 1 (no auto-retry). Pass `{ maxAttempts: N }` to `enqueue` for retries. Failures back off by `retryBackoffMs` (default 1s) before the next alarm.
- **Cancellation is best-effort but observable** — `ctx.signal` fires only if the cancel reaches the same isolate running the job. Cross-isolate cancels still flip the DB to `canceled` and the late return value is discarded.
- **`ctx.continue(state, { afterMs? })`** does **not** end the handler — call it and then `return`. The next alarm calls `onJob` again with `job.resumeFrom = state` for resumption.
- **Terminal rows are pruned** after `retentionMs` (default 24h). Bump on `AppJobRoom` construction if you need longer history.

## DO wiring (already in scaffold)

The scaffolded `worker.ts` already wires `AppJobRoom` to the manifest and routes `/ws/jobs/:roomId`:

```typescript
export class AppJobRoom extends JobRoom<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
  }
  protected async onJob(job: Job, ctx: JobContext): Promise<unknown> {
    return await runJob(job, ctx, this.env)
  }
}
```

Don't edit those bindings — add job types in `src/jobs.ts` and the DO picks them up.

## Enqueueing — two entry points, one underlying queue

**Client side (React)** — when a user clicks a button:

```typescript
import { useJobs } from 'deepspace'
import { SCOPE_ID } from '../constants'

const { enqueue, jobs, getJob, cancel, retry } = useJobs(SCOPE_ID)
const jobId = await enqueue('ai-summarize', { text }, { maxAttempts: 3 })
// jobs / getJob(jobId) are reactive — re-render on every state change
```

**Worker side (cross-isolate)** — from an HTTP route, action, cron, AI route, anywhere outside the DO isolate:

```typescript
import { enqueueJob } from 'deepspace/worker'

app.post('/api/start-export', async (c) => {
  const auth = await resolveAuth(c.req.raw, c.env)
  if (!auth) return c.json({ error: 'unauthorized' }, 401)
  const jobId = await enqueueJob(
    c.env.JOB_ROOMS,
    `app:${c.env.APP_NAME}`,
    'export-csv',
    { filterId: '...' },
    { maxAttempts: 2, enqueuedBy: auth.userId },
  )
  return c.json({ jobId })
})
```

Both paths write the same row to the same DO and broadcast to the same subscribers. Pick by *where the caller lives*, not by job kind. A subclass `onJob` that wants to chain follow-up work can call `this.enqueue(...)` directly (in-isolate, no fetch hop).

## Outbound calls in handlers

`runJob` has `env` in scope and runs as the app owner. Use `createDeepSpaceAI(env, 'anthropic')` for AI calls — it falls back to `APP_OWNER_JWT` automatically and bills the developer. Pass `ctx.signal` to `fetch(url, { signal: ctx.signal })` so client-side `cancel` aborts the upstream request cleanly. To chain follow-up work from inside a subclass `onJob`, call `this.enqueue('next-step', payload)` directly — the in-isolate path skips the HTTP hop the `enqueueJob` helper takes.

## Monitoring UI — `useJobs`

`useJobs(roomId)` is the single client surface for both enqueueing and observing. The returned `jobs` array stays sorted with live/recent first and re-renders on every state change — no manual refetch. Each `JobView` includes `status`, `progress` (0..1, present while live), `progressMessage`, `result` (when succeeded), `error` (when failed), and `attempts`/`maxAttempts` for retry display. The hook auto-reconnects on WebSocket drop and rejects in-flight `enqueue` promises (10s timeout, or immediately on socket close).

**Auth-gate any UI that calls `enqueue` for paid jobs** — the JobRoom DO doesn't enforce a role on enqueue (matches the cron precedent). If your jobs spend owner credits via integrations or AI proxies, gate the button by `useUser().user?.role === 'admin'` or wrap the route in `(protected)/`.

## Testing without waiting for a real upstream

Two patterns work:

1. **Hit the API directly in a Playwright spec** — `POST /api/start-job` (or whatever you name your enqueue route), then either poll `GET /api/jobs/:id` (if you've added that) or subscribe via `useJobs` on a test page and assert against the rendered status.
2. **Use a fast handler in tests** — a job type like `'echo'` that returns its payload with no I/O. Lets you assert the full enqueue → run → succeed pipeline in <1 second without mocking the upstream service.

```typescript
// Example spec — assumes /jobs page renders status via useJobs
test('export job succeeds end-to-end', async ({ page }) => {
  await page.goto('/jobs')
  await page.getByRole('button', { name: /run export/i }).click()
  await expect(
    page.locator('[data-testid="job-row"][data-status="succeeded"]'),
  ).toBeVisible({ timeout: 30_000 })
})
```

Don't write tests that wait for the 16-min crash-recovery sweep to fire. Don't manually flip DB rows. Use the public `enqueue` / `cancel` / `retry` surface from `useJobs`, or call `enqueueJob` from a worker test fixture.
