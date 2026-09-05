// Bengaluru Pulse - feed ingestion + prediction pipeline entrypoint.
// The single function another agent's server bootstrap (src/index.ts) calls
// to wire up: feed adapters -> ingestion worker -> feed_snapshots, and a
// periodic predict -> upsert-events step per active corridor. Runs entirely
// on INGEST_INTERVAL_SECONDS; nothing here is exposed as an HTTP route (see
// API_CONTRACT.md "Internal").

import type { SupabaseClient } from "@supabase/supabase-js";
import { createFeedAdapters } from "./feeds";
import { StubPredictor } from "./predict/stub";
import { runPredictCycle, type CorridorRef } from "./predict/cycle";
import { resolveCorridorIds } from "./ingest/corridors";
import { startIngestionWorker } from "./ingest/worker";

const DEFAULT_INGEST_INTERVAL_SECONDS = 180;

function ingestIntervalSeconds(): number {
  const raw = Number(process.env.INGEST_INTERVAL_SECONDS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_INGEST_INTERVAL_SECONDS;
}

/**
 * Starts the ingestion worker and the periodic predictor cycle. Corridors are
 * resolved from the DB once at startup (see ingest/corridors.ts); the pilot
 * corridor is used as a fallback so this still runs before supabase/seed.sql
 * has been applied to a fresh database.
 */
export function startPipeline(supabase: SupabaseClient): void {
  const intervalSeconds = ingestIntervalSeconds();
  const adapters = createFeedAdapters();
  const predictor = new StubPredictor();

  void bootstrap();

  async function bootstrap(): Promise<void> {
    const corridors = await resolveCorridorIds(supabase);

    startIngestionWorker(supabase, adapters, { corridors, intervalSeconds });
    startPredictionLoop(supabase, corridors, intervalSeconds);

    console.log(
      `[pipeline] started (predictor=${predictor.version}, interval=${intervalSeconds}s, corridors=${corridors
        .map((c) => c.id)
        .join(", ")})`
    );
  }

  function startPredictionLoop(
    client: SupabaseClient,
    corridors: CorridorRef[],
    seconds: number
  ): void {
    const tick = () => {
      for (const corridor of corridors) {
        runPredictCycle(client, predictor, corridor).catch((err) => {
          console.error(`[pipeline] predict cycle failed for ${corridor.id}:`, err);
        });
      }
    };
    tick();
    setInterval(tick, seconds * 1000);
  }
}
