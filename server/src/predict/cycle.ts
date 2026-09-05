// Bengaluru Pulse - one predict cycle: latest readings -> Predictor -> upsert.
// Called periodically by the pipeline for each active corridor.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Predictor } from "../../../shared/predictor";
import { getLatestReadings } from "./readings";
import { upsertPredictedEvent } from "./persist";

export interface CorridorRef {
  id: string;
  name: string;
}

/** Runs predictor.predict() for one corridor from its latest readings and upserts the result. Returns the events.id written. */
export async function runPredictCycle(
  supabase: SupabaseClient,
  predictor: Predictor,
  corridor: CorridorRef
): Promise<string> {
  const readings = await getLatestReadings(supabase, corridor.id);
  const predicted = await predictor.predict({
    corridorId: corridor.id,
    corridorName: corridor.name,
    readings,
    at: new Date().toISOString(),
  });
  return upsertPredictedEvent(supabase, {
    corridorId: corridor.id,
    predicted,
    predictorVersion: predictor.version,
  });
}
