// Bengaluru Pulse - loads the latest feed_snapshots row per source for a
// corridor, shaped as the LatestReadings the Predictor contract expects.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeedReading, FeedSource, LatestReadings, ReadingPayload } from "../shared/feeds";

// Recent-enough window to find the latest row per source without six separate
// queries - feed_snapshots is written by up to 6 sources per corridor per
// ingest tick, so this comfortably covers many ticks of history.
const RECENT_SNAPSHOT_LIMIT = 200;

interface FeedSnapshotRow {
  source: FeedSource;
  corridor_id: string;
  payload: ReadingPayload;
  observed_at: string;
}

export async function getLatestReadings(
  supabase: SupabaseClient,
  corridorId: string
): Promise<LatestReadings> {
  const { data, error } = await supabase
    .from("feed_snapshots")
    .select("source, corridor_id, payload, observed_at")
    .eq("corridor_id", corridorId)
    .order("observed_at", { ascending: false })
    .limit(RECENT_SNAPSHOT_LIMIT);

  if (error) throw new Error(`load feed_snapshots failed for ${corridorId}: ${error.message}`);

  const readings: LatestReadings = {};
  for (const row of (data ?? []) as FeedSnapshotRow[]) {
    if (readings[row.source]) continue; // already have a more recent row for this source
    const reading: FeedReading = {
      source: row.source,
      corridorId: row.corridor_id,
      payload: row.payload,
      observedAt: row.observed_at,
    };
    readings[row.source] = reading;
  }
  return readings;
}
