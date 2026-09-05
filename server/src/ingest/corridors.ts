// Bengaluru Pulse - resolves the corridors the pipeline should run for.
// The schema (supabase/migrations/0001_init.sql) has no "active" flag on
// corridors yet - every row is presumed active - so this is simply "every
// corridor in the corridors table," with a pilot-corridor fallback for local
// dev before supabase/seed.sql has been applied.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CorridorRef } from "../predict/cycle";

const PILOT_CORRIDOR: CorridorRef = { id: "orr-east", name: "ORR East - Silk Board to Marathahalli" };

export async function resolveCorridorIds(supabase: SupabaseClient): Promise<CorridorRef[]> {
  const { data, error } = await supabase.from("corridors").select("id, name");

  if (error) {
    console.error("[pipeline] failed to load corridors, falling back to the pilot corridor:", error);
    return [PILOT_CORRIDOR];
  }

  if (!data || data.length === 0) {
    return [PILOT_CORRIDOR];
  }

  return data as CorridorRef[];
}
