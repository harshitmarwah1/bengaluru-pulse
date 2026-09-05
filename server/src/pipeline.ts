// Bengaluru Pulse - pipeline seam (Wave 1 placeholder).
// The feed-ingestion + prediction pipeline (server/src/feeds/, server/src/predict/,
// server/src/ingest/) is owned by another Wave 1 agent and lands at merge time
// by replacing this file's body. This server only calls startPipeline once,
// after it starts listening - see index.ts.

import type { SupabaseClient } from "@supabase/supabase-js";

export function startPipeline(supabase: SupabaseClient): void {
  /* replaced at merge */
  void supabase;
}
