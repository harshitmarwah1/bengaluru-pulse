// Bengaluru Pulse - ingestion worker.
// On INGEST_INTERVAL_SECONDS, calls every FeedAdapter.fetch(corridorId) for
// each active corridor and inserts normalized readings into feed_snapshots.
// One adapter's outage never stalls the others (fetch returning null is
// expected and skipped; a thrown error is logged and skipped too, per the
// FeedAdapter contract in shared/feeds.ts).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeedReading, FeedSource, ReadingPayload } from "../shared/feeds";
import type { FeedAdapterBundle } from "../feeds";
import type { CorridorRef } from "../predict/cycle";

export interface IngestionWorkerConfig {
  corridors: CorridorRef[];
  intervalSeconds: number;
}

/** Starts the recurring ingestion tick (runs once immediately, then every intervalSeconds). Returns a stop function. */
export function startIngestionWorker(
  supabase: SupabaseClient,
  adapters: FeedAdapterBundle,
  config: IngestionWorkerConfig
): () => void {
  const tick = () => {
    ingestOnce(supabase, adapters, config.corridors).catch((err) => {
      console.error("[ingest] tick failed:", err);
    });
  };

  tick();
  const handle = setInterval(tick, config.intervalSeconds * 1000);
  return () => clearInterval(handle);
}

/** Runs one ingestion pass over every adapter x corridor, inserting whatever readings come back. */
export async function ingestOnce(
  supabase: SupabaseClient,
  adapters: FeedAdapterBundle,
  corridors: CorridorRef[]
): Promise<void> {
  const sources = Object.keys(adapters) as FeedSource[];

  for (const corridor of corridors) {
    for (const source of sources) {
      const adapter = adapters[source];
      let reading: FeedReading<ReadingPayload> | null;
      try {
        reading = await adapter.fetch(corridor.id);
      } catch (err) {
        // Contract: fetch() should only throw on misconfiguration, never an
        // expected outage - surface it but keep ingesting the other sources.
        console.error(`[ingest] ${source} adapter misconfigured for ${corridor.id}:`, err);
        continue;
      }

      if (!reading) continue; // source temporarily unavailable - keep the last snapshot

      const { error } = await supabase.from("feed_snapshots").insert({
        source: reading.source,
        corridor_id: reading.corridorId,
        payload: reading.payload,
        observed_at: reading.observedAt,
      });
      if (error) {
        console.error(`[ingest] insert failed for ${source}/${corridor.id}:`, error.message);
      }
    }
  }
}
