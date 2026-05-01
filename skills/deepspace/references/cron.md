# Cron — scheduled background work

Load this reference when adding a cron job (digest, cleanup, periodic sync), building an admin page that monitors / triggers / pauses cron tasks, debugging "why didn't my task fire," or migrating a stale `cron.json` / `handleCron` / `/internal/cron` setup. Skip it for one-shot manual operations (use a server action instead).

## Architecture

The scaffold ships a per-app `AppCronRoom extends CronRoom` DO; tasks live in `src/cron.ts` and run on the DO's alarm. There is **no `cron.json`, no `/internal/cron` endpoint, and no platform dispatch worker** — every app schedules and runs its own work in its own DO.

## Define tasks in `src/cron.ts`

```typescript
import type { CronTask } from 'deepspace/worker'
import { buildCronContext } from 'deepspace/worker'

export const tasks: CronTask[] = [
  { name: 'heartbeat', intervalMinutes: 1 },
  { name: 'daily-digest', schedule: '0 9 * * *', timezone: 'America/New_York' },
]

export async function runTask(name: string, env: Env): Promise<void> {
  const ctx = buildCronContext(env, env.OWNER_USER_ID, `app:${env.APP_NAME}`)
  if (name === 'heartbeat') {
    // ctx.tools.{create,update,remove,get,query} — same shape as server actions, runs as app owner
    // ctx.integration(endpoint, data) — proxied through api-worker, billed to the owner JWT
  } else if (name === 'daily-digest') {
    // ...
  }
}
```

## Task declaration rules

- Each task declares **either** `intervalMinutes` (every N minutes) **or** `schedule` + `timezone` (5-field cron expression evaluated against an IANA timezone). Declaring both, or neither, throws at DO construction time.
- Cron mode is DST-aware — the wall-clock comparison happens after the timezone shift.
- Optional `paused: true` starts the task disabled; toggle it later via the `useCronMonitor` UI.

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

Render task status, history, and `trigger` / `pause` / `resume` controls with `useCronMonitor('app:<APP_NAME>')` from `deepspace`. The hook returns `{ tasks, history, connected, trigger(name), pause(name), resume(name) }`. Auth-gate the page (admin role) — the DO does not enforce who can call `trigger` / `pause` / `resume`, so without a client-side role check any signed-in user can fire owner-billed tasks.

## Reference implementation

`npx deepspace add cron` installs a working cron feature: a 1-minute `heartbeat` task in `src/cron.ts`, an admin `/cron-log` page that uses `useCronMonitor`, and a `tests/feature-tests/tests/cron.spec.ts` you can read for selectors. Read that scaffold before writing your own — it covers the structural pieces.

## Testing without waiting for the schedule

`trigger(taskName)` runs `onTask` immediately on the DO via the same code path as the alarm. For app-level cron logic, that's the right test surface — a Playwright spec calls `trigger` and asserts the resulting `cron_history` row, all in seconds:

```typescript
test('daily-digest writes a daily-context record', async ({ page }) => {
  await page.goto('/cron')
  await page.getByRole('button', { name: /run now/i }).click()
  // The new row arrives via the WebSocket the page already has open.
  await expect(
    page.locator('[data-testid="cron-log-row"][data-task="daily-digest"]'),
  ).toBeVisible({ timeout: 5_000 })
  // Optional: assert the record this task is supposed to produce.
  await page.goto('/')
  await expect(page.getByTestId('daily-context-banner')).toBeVisible()
})
```

Don't write tests that wait for `0 9 * * 1-5` to fire. Don't change schedules to `intervalMinutes: 1` just for testing — use `trigger` instead. (Use `intervalMinutes: 1` only to verify the alarm path itself, which `trigger` bypasses; the SDK's own `cron.spec.ts` does this with its `heartbeat` task and a 130-second wait.)

## Migration note

If you find a stale `cron.json`, `handleCron`, `/internal/cron`, `verifyInternalSignature`, or `buildInternalPayload` in an existing app, those are the pre-`CronRoom` pattern. Delete them and rewrite to the shape above; `verifyInternalSignature` / `buildInternalPayload` still exist in `deepspace/worker` for other internal HMAC use, but cron does not need them.
