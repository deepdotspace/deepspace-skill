# LiveKit integration — audio / video rooms

Load this reference when the app needs audio or video rooms — voice chat, video calls, watch-together rooms, real-time transcription. Skip it for text-only collaborative apps.

There is **no `useMediaRoom` SDK hook**. Audio/video uses LiveKit via the `livekit/*` integration endpoints — the deepspace SDK gives you the room-management surface (create, list, delete rooms; mint tokens) and you wire the LiveKit client SDK on the frontend yourself.

## Endpoints

Five endpoints. **Billing varies by endpoint** — read the table carefully before flipping `src/integrations.ts`:

| Endpoint | Inputs (required) | Returns | Billing |
|---|---|---|---|
| `livekit/generate-token` | `roomName` (also `displayName?`, `ttlSeconds?` 60-86400, default 3600) | `{ token, url, roomName }` | Free (`per_request`, `baseCost: 0`). Room auto-creates when the first participant connects. No max-participant enforcement, no duration cap. |
| `livekit/create-room` | `roomName` (also `maxParticipants?` 1-100 default 10, `durationMinutes?` 1-1440 default 60, `metadata?`) | `{ roomSid, roomName, roomSessionId, adminToken, livekitUrl, expiresAt, maxParticipants, durationMinutes }` | **Billable (`per_actual_cost`).** At create time it **reserves the worst case** — `maxParticipants × durationMinutes × $0.0005` (`LIVEKIT_RATE_PER_PARTICIPANT_MIN`) — then **settles down** to the actual client-reported participant-minutes when you call `livekit/settle-room`, **refunding the unused reservation**. Until you settle, the reservation stands (a cron caps an abandoned cloud room at exactly that reservation). A **self-hosted** host (any `LIVEKIT_URL` not under `*.livekit.cloud`) costs nothing per-minute, so its reservation is voided to zero. Markup is applied at settlement. |
| `livekit/settle-room` | `roomSessionId` (from `create-room`), `participantMinutes` (≥ 0) | `{ ok, billedParticipantMinutes }` | Free (`per_request`, `baseCost: 0`). Bills the reported participant-minutes **clamped to the reservation cap** and refunds the remainder. **Call it when a room session ends** — otherwise the full reservation is billed. Idempotent per `roomSessionId`, and **only the room's creator may settle** (create-room records the owner). |
| `livekit/delete-room` | `roomName` | `{ deleted, roomName }` | Free (`per_request`, `baseCost: 0`). **Does not settle billing** — deleting a room does not release the `create-room` reservation; call `livekit/settle-room` for that. **No creator check** — any authenticated caller can delete any room by name. Gate access at the application layer. |
| `livekit/list-rooms` | (none) | `{ rooms: [...] }` (Twirp `ListRooms` shape) | Free (`per_request`, `baseCost: 0`). |

Full input/output schemas live in `assets/integrations/livekit.yaml`.

## Two flows — pick the right one

### Ad-hoc / free flow (most apps)

For small group calls, low-stakes voice chat, "drop into a room" UX:

1. Client calls `integration.post('livekit/generate-token', { roomName, displayName })` — returns `{ token, url, roomName }`.
2. Client connects to LiveKit using `token` and `url` via the `livekit-client` SDK (or `@livekit/components-react`).
3. The room auto-materializes on first connect, auto-disposes when empty. **No `create-room` call needed; no billing.**

This is the default unless you need participant or duration limits.

### Billable flow (rooms with quotas)

For paid features, large meetings, time-limited sessions:

1. Server-side (or via a server action), call `integration.post('livekit/create-room', { roomName, maxParticipants, durationMinutes })` — **reserves** the worst-case cost (`maxParticipants × durationMinutes × $0.0005`, see Billing column), returns `adminToken` for the creator plus a `roomSessionId` you keep for settlement.
2. Mint per-user tokens with `livekit/generate-token` (free; the room itself is the billed object).
3. When the host ends the session, call `livekit/settle-room` with the saved `roomSessionId` and the actual `participantMinutes` — this **settles billing down to actual usage and refunds the unused reservation** (only the creator may settle). Skip it and the full reservation is billed. Optionally also call `livekit/delete-room` to tear the room down (free, but no creator check — enforce host-only deletion yourself, e.g. gate the "End meeting" button on `useUser().user?.id === room.createdBy`, or store the creator in your own collection and check before calling).

## Auth-gating

Always auth-gate the page that mints tokens. A leaked `generate-token` token gives anyone access to the room until `ttlSeconds` expires (default 1 hour). Wrap the calling component in `useAuth().isSignedIn` (or behind `<AuthGate>` if the whole page is gated).

For the billable flow, auth-gate `create-room` and `delete-room` carefully. `create-room` reserves a worst-case charge (`maxParticipants × durationMinutes × $0.0005`, settled down later) against the app owner (developer-billed) or the calling user (if you flip `livekit` to `'user'` in `src/integrations.ts`). `settle-room` refunds the unused portion and is creator-only, so it needs no extra gating. `delete-room` is free but has no SDK-side creator check, so an authenticated caller can tear down any room — application-layer gating is mandatory for any multi-tenant flow.

## Client-SDK note

The LiveKit JS SDK is **not bundled with deepspace** — install it as a peer dependency:

```bash
npm i livekit-client
# or for React-shaped components:
npm i @livekit/components-react @livekit/components-styles livekit-client
```

The deepspace SDK only handles the auth/room-lifecycle proxy; the client-side WebRTC plumbing is yours. See livekit.io's own docs for the client-SDK API surface — the deepspace skill doesn't re-document that.

## See also

- `references/integrations.md` for general `integration.post(...)` patterns and billing setup.
- `assets/integrations/livekit.yaml` for full input/output schemas.
