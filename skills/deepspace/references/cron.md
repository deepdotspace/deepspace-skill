# Cron — scheduled background work

Load this reference when adding a cron job (digest, cleanup, periodic sync), building an admin page that monitors / triggers / pauses cron tasks, debugging "why didn't my task fire," or migrating a stale `cron.json` / `handleCron` / `/internal/cron` setup. Skip it for one-shot manual operations (use a server action instead) or background work triggered by user actions rather than a schedule (use `references/jobs.md`).

## Architecture

The scaffold ships a per-app `AppCronRoom extends CronRoom` DO; tasks live in `src/cron.ts` and run on the DO's alarm. There is **no `cron.json`, no `/internal/cron` endpoint, and no centralized cron dispatcher** — every app schedules and runs its own work in its own DO via Cloudflare alarms.

## Define tasks in `src/cron.ts`

```typescript
import type { CronTask } from 'deepspace/worker'
import { buildCronContext } from 'deepspace/worker'

export const tasks: CronTask[] = [
  { name: 'heartbeat', intervalMinutes: 1 },
  { name: 'daily-digest', schedule: '0 9 * * *', timezone: 'America/New_York' },
]

export async function runTask(name: string, env: Env): Promise<void> {
  // buildCronContext(env, ownerUserId, roomId?) — roomId defaults to 'default'.
  // Pass `app:${env.APP_NAME}` for the per-app RecordRoom (matches scaffold convention).
  const ctx = buildCronContext(env, env.OWNER_USER_ID, `app:${env.APP_NAME}`)
  if (name === 'heartbeat') {
    // Records — runs as app owner (bypasses caller RBAC). Shapes differ from
    // tools.* in server actions — ctx.records unwraps the ActionResult envelope
    // and returns the data field directly:
    //   ctx.records.query(collection, { where?, limit? })  → Promise<Envelope[]>     (already unwrapped — the records array)
    //   ctx.records.create(collection, data)               → Promise<{ recordId, record: Envelope }>
    //   ctx.records.update(collection, recordId, data)     → Promise<{ recordId, record: Envelope }>
    //   ctx.records.delete(collection, recordId)           → Promise<{ deleted: true }>
    // Each Envelope is { recordId, data, createdBy, createdAt, updatedAt }.
    // Throws on any tool failure (rather than returning { success: false, error })
    // — wrap in try/catch if you need to handle a denied write inline.
    //
    // Integrations — proxied through api-worker, billed to the app owner
    // (auth: `Authorization: Bearer ${env.APP_OWNER_JWT}`; throws clearly if
    // APP_OWNER_JWT is missing locally — `npx deepspace dev` mints it into
    // .dev.vars). Returns the unwrapped `data` field; throws
    // `Integration call <endpoint> failed: <detail>` on non-2xx or success:false:
    //   ctx.integrations.call(endpoint, params)            → Promise<response>
    //
    // Owner user ID:
    //   ctx.ownerUserId
  } else if (name === 'daily-digest') {
    // ...
  }
}
```

> **API-shape gotcha** — properties are **plural** (`records`, `integrations`) and the integrations method is `call`, not direct invocation. The names match the typed shape returned by `buildCronContext` — `{ records, integrations, ownerUserId }`. There is no `ctx.tools` and no `ctx.integration` (singular).

## Task declaration rules

- Each task declares **either** `intervalMinutes` (every N minutes) **or** `schedule` + `timezone` (5-field cron expression evaluated against an IANA timezone). Declaring both, or neither, throws at DO construction time.
- Cron mode is DST-aware — the wall-clock comparison happens after the timezone shift.
- Optional `paused: true` starts the task disabled. Toggle it at runtime by calling `pause(name)` / `resume(name)` from `useCronMonitor` — the scaffolded `/cron-log` page is read-only and doesn't expose those, so build the controls into your own admin page (and gate them; see "Monitoring UI" below).

## DO wiring (already in scaffold)

The scaffolded `worker.ts` already wires `AppCronRoom` to the manifest and routes `/ws/cron/:roomId`:

```typescript
export class AppCronRoom extends CronRoom {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env, { tasks: cronTasks })
    this.env = env
  }
  protected async onTask(taskName: string): Promise<void> {
    await runCronTask(taskName, this.env)
  }
}
```

Don't edit those bindings — add tasks in `src/cron.ts` and the DO picks them up at construction.

## Outbound calls in handlers

`runTask` runs as the app owner. Use the `ctx` from `buildCronContext` for record mutations and integration calls; the api-worker bills `APP_OWNER_JWT`. For autonomous LLM calls use `createDeepSpaceAI(env, 'anthropic')` without `authToken` — it falls back to `APP_OWNER_JWT` automatically.

## Monitoring UI — `useCronMonitor`

Render task status, history, and (optionally) `trigger` / `pause` / `resume` controls with `useCronMonitor(roomId)` from `deepspace`. Pass `SCOPE_ID` from `src/constants.ts` (default `app:${APP_NAME}`) to hit the app's `AppCronRoom` DO. The hook returns `{ tasks, history, connected, canWrite, trigger(name), pause(name), resume(name) }`. Each task is a `CronTaskState` (`{ name, intervalMinutes, schedule, timezone, paused, lastRunAt, nextRunAt }`); each history entry is a `CronHistoryEntry` (`{ taskName, startedAt, completedAt, success, durationMs, error? }`).

**Server gates `trigger` / `pause` / `resume` on the role the wsRoute resolver returns.** `canWrite` defaults false until the server AUTH frame lands and stays false for any connection without a writer role, and write callbacks **silently no-op when false**. The scaffolded `/ws/cron/:roomId` passes `() => ({ role: 'member' })`, so any signed-in user gets `canWrite: true` and can fire owner-billed tasks; anonymous connections get no role and become read-only viewers. For owner-only writes, replace the wsRoute helper with an inline handler that resolves role from app state (e.g., return `role: 'member'` only when the JWT subject matches `OWNER_USER_ID`). Also gate the UI client-side by `useUser().user?.role === 'admin'` (or just `canWrite`) before rendering the buttons. Pure read-only monitoring (`tasks` + `history` + `connected`) is fine to leave open — the scaffolded page does this.

## Reference implementation

`npx deepspace add cron` installs:

- a 1-minute `heartbeat` task in `src/cron.ts` (no-op `runTask` — extend it),
- a public, read-only `/cron-log` viewer page (`src/pages/cron-log.tsx`) that subscribes via `useCronMonitor(SCOPE_ID)` and renders `tasks` + `history` + connection status. It does **not** expose `trigger` / `pause` / `resume` — add those yourself with the admin-gating rule above if you need them.

The cron feature does **not** ship a Playwright spec into the scaffolded app — it adds the runtime surfaces only. Write your own cron spec in `tests/api.spec.ts` using `trigger` to fire `onTask` synchronously and asserting against `cron_history`. Don't wait for `intervalMinutes: 1` to tick.

## Testing without waiting for the schedule

`trigger(taskName)` runs `onTask` immediately on the DO via the same code path as the alarm. That's the right test surface for app-level cron logic — a Playwright spec calls `trigger` from a page that exposes the admin controls, then asserts the resulting `cron_history` row arrives via the WS subscription. **Build a small admin page (or test-only page) that wires up `useCronMonitor`'s `trigger`** — the scaffolded `/cron-log` is read-only and won't suffice.

```typescript
// Assumes you've added an admin page at /cron with a "Run now" button per task
// that calls trigger(name) from useCronMonitor.
test('daily-digest produces a cron_history row when triggered', async ({ page }) => {
  await page.goto('/cron')
  await page.getByRole('button', { name: /run now: daily-digest/i }).click()
  // The new row arrives via the WebSocket the page already has open.
  await expect(
    page.locator('[data-testid="cron-log-row"][data-task="daily-digest"]'),
  ).toBeVisible({ timeout: 5_000 })
  // Optional: assert the side effect the task is supposed to produce.
  await page.goto('/')
  await expect(page.getByTestId('daily-context-banner')).toBeVisible()
})
```

Don't write tests that wait for `0 9 * * 1-5` to fire. Don't change schedules to `intervalMinutes: 1` just for testing — use `trigger` instead. Reach for `intervalMinutes: 1` only when you specifically need to verify the alarm path itself (`trigger` bypasses it) — budget ~130 seconds for the heartbeat to fire and the row to arrive.

## Migration note

If you find a stale `cron.json`, `handleCron`, or `/internal/cron` route in an existing app, those are the pre-`CronRoom` pattern. Delete them and rewrite to the shape above. Use `buildCronContext(env, ownerUserId, roomId?)` for all cron-side I/O — it signs `ctx.integrations.call(...)` with `APP_OWNER_JWT` so you don't hand-roll request auth. (`Env` must extend `ApiWorkerEnv` — `API_WORKER` service binding or `API_WORKER_URL` fallback — and carry `APP_OWNER_JWT`; the scaffolded `worker.ts` already does both.)
