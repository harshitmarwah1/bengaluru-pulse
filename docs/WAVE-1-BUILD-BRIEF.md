# Bengaluru Pulse - Wave 1 Build Brief

Orchestrated by Opus 4.8. This brief dispatches the Wave 1 swarm against the **locked Wave 0
foundation**. Do not edit the foundation contracts during Wave 1 - if a contract is wrong, stop and
escalate to the orchestrator.

## Locked foundation (Wave 0)
- DB schema: `supabase/migrations/0001_init.sql` + `supabase/seed.sql`
- Domain types: `shared/types.ts`
- Feed contract: `shared/feeds.ts` (`FeedAdapter`, normalized readings)
- Prediction contract: `shared/predictor.ts` (`Predictor`, `PredictedEvent`)
- API contract: `API_CONTRACT.md` (v2)
- Env schema: `server/.env.example`, `console/.env.example`, `mobile/.env.example`
- Design system: `ARCHITECTURE.md` "Civic Authority" + `DESIGN-REFERENCE.html` (build to match)

## Global rules (from CLAUDE.md / AGENTS.md)
- No em dashes; plain `-`. Do not hand-edit CHANGELOG or generated files.
- Prefer quality, simplicity, robustness, maintainability over dev-cost shortcuts.
- Match surrounding code style, comment density, naming.
- **Verification before "done":** run lint + typecheck + tests and report real output. No success claims without evidence.
- Adapters: key present => live; key absent => `stub` behind the same interface. Never block the build on a missing key.
- Secrets only via env; never commit real keys.

## Agents (routed by complexity)

### Sonnet A - Backend API + auth + realtime
Owns: `server/`.
- Replace in-memory state with a Supabase data layer (service-role client).
- Implement API_CONTRACT v2: `/api/events`, `/api/events/:id`, `/api/pulse`, `/api/push/register`, `/api/advisory/send`, `/api/recommendations/:id/approve`, `/api/health`.
- Officer JWT verification middleware (Supabase); `audit_log` on every write.
- Expo push fan-out via `expo-server-sdk`.
- Keep the existing DTO shapes (`PulseEvent`/`CitizenPulse`) so clients need no shape changes.

### Sonnet B - Ingestion + prediction
Owns: `server/src/feeds/`, `server/src/predict/`, `server/src/ingest/`.
- `FeedAdapter` impls: traffic, rain, bus = live-capable (read keys, else stub); metro, flood, population = stub now. Each with a matching `stub` that returns deterministic ORR-shaped data so the system is fully functional with zero keys.
- Ingestion worker on `INGEST_INTERVAL_SECONDS` -> `feed_snapshots`.
- `Predictor` stub (`version "stub-0"`): reads `LatestReadings`, emits a `PredictedEvent` matching today's ORR scenario numbers, so console/mobile look identical to the demo until a real model lands. Clean seam for heuristic/ML later.
- One-off script to port `shared/scenario.ts` into a first `events` row for local dev.

### Sonnet C - Console (web)
Owns: `console/`.
- Supabase Auth officer login (email/password to start); attach JWT to API calls.
- Point at real API; subscribe to Supabase Realtime for live event/rec updates (remove any polling).
- Amplitude Browser SDK + the event taxonomy (see production readiness doc / Amplitude section).
- Preserve the "Civic Authority" design exactly; keep the legend fix. Light + dark.

### Sonnet D - Mobile (citizen)
Owns: `mobile/`.
- Point at real API (`/api/pulse`), keep graceful offline/mock fallback.
- Real push WIRED but credentials STUBBED (no Apple/FCM yet): `expo-notifications` flow, token register, tap-to-open; guard so it no-ops cleanly without creds. EAS config files present (`eas.json`) for later `eas build`.
- Amplitude React Native SDK + taxonomy.
- Keep design parity + timeline scrubber.

### Haiku helpers (mechanical, alongside)
- CI: `.github/workflows/` (lint + typecheck + test on PR; deploy hooks).
- Deploy manifests: `railway.json` (API + worker services), `vercel.json` (console), `mobile/eas.json`.
- `shared` barrel exports; Amplitude event-name constants module (shared by C + D).
- `ENVIRONMENT.md` cross-check against the three `.env.example` files.

## Isolation + integration
- Each Sonnet agent works in its own git worktree off `main`.
- Boundaries above are exclusive - no two agents edit the same file; anything shared belongs to `shared/` (frozen) or is a Haiku-owned new file.
- Wave 2 (orchestrator): merge in order A -> B -> C -> D, resolve, run full lint/typecheck/test + E2E, fix, then present.

## Definition of done (Wave 1)
Each package builds, typechecks, and lints clean; the system runs end-to-end locally on **stub adapters with no external keys** (console + mobile show the ORR scenario from Supabase, approve + advisory work, audit rows written); real adapters activate the moment a key is set.
