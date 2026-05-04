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
  // buildCronContext(env, ownerUserId, roomId?) — roomId defaults to 'default'.
  // Pass `app:${env.APP_NAME}` for the per-app RecordRoom (matches scaffold convention).
  const ctx = buildCronContext(env, env.OWNER_USER_ID, `app:${env.APP_NAME}`)
  if (name === 'heartbeat') {
    // Records — runs as app owner (bypasses caller RBAC):
    //   ctx.records.query(collection, { where?, limit? })  → Promise<any[]>
    //   ctx.records.create(collection, data)               → Promise<record>
    //   ctx.records.update(collection, recordId, data)     → Promise<record>
    //   ctx.records.delete(collection, recordId)           → Promise<void>
    //
    // Integrations — proxied through api-worker via signed internal HMAC,
    // billed to the app owner (uses INTERNAL_STORAGE_HMAC_SECRET):
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

Render task status, history, and (optionally) `trigger` / `pause` / `resume` controls with `useCronMonitor(roomId)` from `deepspace`. Pass `SCOPE_ID` from `src/constants.ts` (default `app:${APP_NAME}`) to hit the app's `AppCronRoom` DO. The hook returns `{ tasks, history, connected, trigger(name), pause(name), resume(name) }`. Each task is a `CronTaskState` (`{ name, intervalMinutes, schedule, timezone, paused, lastRunAt, nextRunAt }`); each history entry is a `CronHistoryEntry` (`{ taskName, startedAt, completedAt, success, durationMs, error? }`).

**Auth-gate any page that exposes `trigger` / `pause` / `resume`** — the CronRoom DO does **not** enforce a role on these messages, so without a client-side role check any signed-in user can fire owner-billed tasks. Gate by `useUser().user?.role === 'admin'` before rendering the buttons (and ideally also wrap the route in `(protected)/`). Pure read-only monitoring (`tasks` + `history` + `connected`) is fine to leave open — the scaffolded page does this.

## Reference implementation

`npx deepspace add cron` installs:

- a 1-minute `heartbeat` task in `src/cron.ts` (no-op `runTask` — extend it),
- a public, read-only `/cron-log` viewer page (`src/pages/cron-log.tsx`) that subscribes via `useCronMonitor(SCOPE_ID)` and renders `tasks` + `history` + connection status. It does **not** expose `trigger` / `pause` / `resume` — add those yourself with the admin-gating rule above if you need them.

The cron feature does **not** ship a Playwright spec into the scaffolded app — it adds the runtime surfaces only. The SDK monorepo's own `tests/feature-tests/tests/cron.spec.ts` (130s heartbeat-fires-and-renders test) is what `npx deepspace test` would invoke if the SDK's feature-tests harness is present, but a fresh scaffolded app has no `tests/feature-tests/` directory unless you add one. Write your own cron spec in `tests/api.spec.ts` (use `trigger` to fire `onTask` synchronously, then assert against `cron_history`) instead of waiting for `intervalMinutes: 1` to tick.

## Testing without waiting for the schedule

`trigger(taskName)` runs `onTask` immediately on the DO via the same code path as the alarm. That's the right test surface for app-level cron logic — a Playwright spec calls `trigger` from a page that exposes the admin controls, then asserts the resulting `cron_history` row arrives via the WS subscription. **Build a small admin page (or test-only page) that wires up `useCronMonitor`'s `trigger`** — the scaffolded `/cron-log` is read-only and won't suffice. The SDK monorepo's `tests/feature-tests/tests/cron.spec.ts` shows the alternative pattern (waiting for the alarm to actually fire) and budgets 130 seconds for it; prefer `trigger` if you can.

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

Don't write tests that wait for `0 9 * * 1-5` to fire. Don't change schedules to `intervalMinutes: 1` just for testing — use `trigger` instead. (Use `intervalMinutes: 1` only to verify the alarm path itself, which `trigger` bypasses; the SDK's own `cron.spec.ts` does this with its `heartbeat` task and a 130-second wait.)

## Migration note

If you find a stale `cron.json`, `handleCron`, or `/internal/cron` route in an existing app, those are the pre-`CronRoom` pattern. Delete them and rewrite to the shape above. **Don't delete `verifyInternalSignature` / `buildInternalPayload` / `signInternalPayload` / `computeHmacHex` / `timingSafeEqualHex` / `DEFAULT_MAX_SKEW_MS`** — `buildCronContext` itself uses `signInternalPayload` + `buildInternalPayload` to authenticate `ctx.integrations.call(...)` HMAC calls to the api-worker. These primitives stay in `deepspace/worker`.
