// Bengaluru Pulse - persists a PredictedEvent to Supabase (events + children).
// Runs on every predict cycle, so every write here is an upsert, not an
// insert: re-running the predictor must converge onto the same rows rather
// than accumulate duplicates, and must never clobber officer-driven state.
//
// Officer-owned columns (recommendations.status / status_meta, mutated by
// POST /api/recommendations/:id/approve - see API_CONTRACT.md) are never
// included in the upsert payload here, so re-upserting a recommendation's
// content (title/detail/priority) leaves its live status untouched. A brand
// new recommendation id still gets the table's default ('pending').

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PredictedEvent } from "../../../shared/predictor";
import { deriveEventId, deriveRecommendationId } from "./ids";

export interface UpsertPredictedEventParams {
  corridorId: string;
  predicted: PredictedEvent;
  predictorVersion: string;
}

/** Upserts a predicted event (+ recommendations + timeline) and returns the events.id written. */
export async function upsertPredictedEvent(
  supabase: SupabaseClient,
  { corridorId, predicted, predictorVersion }: UpsertPredictedEventParams
): Promise<string> {
  const eventId = deriveEventId(corridorId);
  const now = new Date().toISOString();

  const { error: eventError } = await supabase.from("events").upsert(
    {
      id: eventId,
      corridor_id: corridorId,
      window_label: predicted.windowLabel,
      lead_time_min: predicted.leadTimeMin,
      state: predicted.state,
      confidence_pct: predicted.confidencePct,
      uncertainty_min: predicted.uncertaintyMin,
      impact: predicted.impact,
      factors: predicted.factors,
      predictor_version: predictorVersion,
      updated_at: now,
    },
    { onConflict: "id" }
  );
  if (eventError) throw new Error(`upsert events failed for ${eventId}: ${eventError.message}`);

  await upsertRecommendations(supabase, eventId, predicted);
  await replaceTimeline(supabase, eventId, predicted);

  return eventId;
}

async function upsertRecommendations(
  supabase: SupabaseClient,
  eventId: string,
  predicted: PredictedEvent
): Promise<void> {
  const rows = predicted.recommendations.map((rec) => ({
    id: deriveRecommendationId(eventId, rec.owner, rec.priority),
    event_id: eventId,
    owner_agency: rec.owner,
    title: rec.title,
    detail: rec.detail,
    priority: rec.priority,
    triggers_citizen_push: rec.triggersCitizenPush ?? false,
    updated_at: new Date().toISOString(),
    // status / status_meta deliberately omitted - see file header.
  }));

  if (rows.length > 0) {
    const { error } = await supabase.from("recommendations").upsert(rows, { onConflict: "id" });
    if (error) throw new Error(`upsert recommendations failed for ${eventId}: ${error.message}`);
  }

  // Drop recommendations from a previous prediction that the current one no
  // longer produces (stub-0 never does this - the seam matters once a
  // heuristic/ML predictor can change the recommendation set over time).
  const currentIds = rows.map((r) => r.id);
  const filter = currentIds.length > 0 ? `(${currentIds.join(",")})` : "()";
  const { error: deleteError } = await supabase
    .from("recommendations")
    .delete()
    .eq("event_id", eventId)
    .not("id", "in", filter);
  if (deleteError) {
    throw new Error(`prune stale recommendations failed for ${eventId}: ${deleteError.message}`);
  }
}

async function replaceTimeline(
  supabase: SupabaseClient,
  eventId: string,
  predicted: PredictedEvent
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("timeline_snapshots")
    .delete()
    .eq("event_id", eventId);
  if (deleteError) {
    throw new Error(`clear timeline_snapshots failed for ${eventId}: ${deleteError.message}`);
  }

  if (predicted.timeline.length === 0) return;

  const rows = predicted.timeline.map((snap) => ({
    event_id: eventId,
    time_label: snap.time,
    clock_minutes: snap.clockMinutes,
    state: snap.state,
    advisory: snap.advisory,
    citizen_headline: snap.citizenHeadline,
    confidence_pct: snap.confidencePct,
  }));

  const { error: insertError } = await supabase.from("timeline_snapshots").insert(rows);
  if (insertError) {
    throw new Error(`insert timeline_snapshots failed for ${eventId}: ${insertError.message}`);
  }
}
