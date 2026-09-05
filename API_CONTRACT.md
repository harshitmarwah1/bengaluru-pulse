# Bengaluru Pulse - API Contract (v2, production)

Binding interface between packages. `server/` implements it; `console/` and `mobile/` are clients.
v2 supersedes the in-memory v1: data is Supabase-backed, the console is authenticated, and the
system is multi-corridor. Types live in `shared/types.ts`; feed/predictor contracts in
`shared/feeds.ts` and `shared/predictor.ts`.

- **Base URL:** local `http://localhost:4000`; prod = the Railway API URL.
- **Content-Type:** `application/json`.
- **CORS:** allow the console origin (local `http://localhost:5173`; prod = the Vercel domain) and Expo origins.
- **Data:** the server reads/writes Supabase via the **service-role** key (bypasses RLS). Clients never touch the DB for writes.

## Authentication
- **Console (officers):** Supabase Auth. The browser holds a Supabase session; every console API call sends `Authorization: Bearer <supabase access token>`. The server verifies the JWT and loads the `officers` row. All write endpoints require a valid officer; each write is recorded in `audit_log`.
- **Mobile (citizens):** anonymous. No auth on `/api/pulse` and `/api/push/register`.

## Realtime
The console subscribes directly to **Supabase Realtime** (Postgres changes on `events` and `recommendations`) using the anon key, so approvals and new predictions update live without polling. Not an HTTP endpoint - documented here as part of the contract.

---

## GET `/api/events?corridor=<id>`
List current risk events (one per active corridor). `corridor` optional filters to one. Returns `PulseEvent[]`. Auth: officer.

## GET `/api/events/:id`
Full `PulseEvent` for one event (recommendations, timeline, outcome joined in). Auth: officer.

## GET `/api/pulse?corridor=<id>&at=<clockMinutes>`
Citizen subset for the mobile app. Returns `CitizenPulse` for the corridor's current event. `at` selects a timeline snapshot for the scrubber; omitted = current. Defaults to the pilot corridor (`orr-east`) if `corridor` omitted. Auth: none.

## POST `/api/push/register`
Body `{ "expoPushToken": "...", "area": "Marathahalli" }`. Upserts into `push_tokens` (dedupe by token). Returns `{ "ok": true, "registered": <n> }`. Auth: none.

## POST `/api/advisory/send`
Auth: officer. Builds a `PushMessage` from the current `CitizenPulse`, fans out via Expo Push to all `push_tokens`, writes an `advisories` row, marks the DULT advisory recommendation `sent` with `"Sent <time> - <n> reached"`, logs to `audit_log`. Body optional `{ "at": <clockMinutes>, "corridor": "<id>" }`. Returns `{ "ok": true, "sent": <n>, "message": PushMessage }`. With zero tokens, returns `200 { "sent": 0 }`.

## POST `/api/recommendations/:id/approve`
Auth: officer. Advances `pending -> awaiting` (`"Assigned - awaiting <owner>"`); for a `triggers_citizen_push` rec, also runs the advisory-send path. Writes `audit_log`. Returns the updated `Recommendation`.

## GET `/api/health`
`{ "ok": true }`. Used by deploy/integration checks. Auth: none.

## Internal
Ingestion runs as a scheduled worker (not a public route). An optional `POST /internal/ingest` guarded by the service-role key may trigger a manual pull for ops/testing.

---

## Feed + prediction pipeline (server-side, see `shared/feeds.ts`, `shared/predictor.ts`)
1. Ingestion worker runs every `INGEST_INTERVAL_SECONDS`: each `FeedAdapter.fetch(corridor)` -> normalized `FeedReading` -> insert `feed_snapshots`.
2. The `Predictor` reads the latest snapshot per source (`LatestReadings`) -> `PredictedEvent` -> upsert `events` (+ recommendations, timeline). `predictor_version` is stamped.
3. Console reads via API + Realtime; mobile reads `/api/pulse`; advisory push closes the citizen loop; outcomes are measured post-window from the traffic feed.

## Expo Push
One POST per token to `https://exp.host/--/api/v2/push/send` (use `expo-server-sdk` for chunking/receipts). `EXPO_ACCESS_TOKEN` optional.
