// Bengaluru Pulse - one-off dev seed script.
// Ports shared/scenario.ts's canonical ORR East event into Supabase (events +
// recommendations + timeline_snapshots + outcomes) so local dev has real
// data to point the console/mobile at before the pipeline has run a single
// predict cycle. Safe to re-run: every write is an upsert onto the same rows
// the periodic pipeline (src/pipeline.ts) will later converge onto - they
// share the same id-derivation helpers (src/predict/ids.ts).
//
// Usage (from server/): SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx src/scripts/seed-event.ts
// or: npm run seed:event   (reads server/.env if you load it into the shell first)

import { createClient } from "@supabase/supabase-js";
import { EVENT } from "../shared/scenario";
import { deriveEventId, deriveRecommendationId } from "../predict/ids";

const CORRIDOR_ID = "orr-east";

async function main(): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see server/.env.example)"
    );
  }

  const supabase = createClient(url, serviceRoleKey);
  const eventId = deriveEventId(CORRIDOR_ID);

  console.log(`[seed-event] writing ${eventId} for corridor ${CORRIDOR_ID}...`);

  const { error: eventError } = await supabase.from("events").upsert(
    {
      id: eventId,
      corridor_id: CORRIDOR_ID,
      window_label: EVENT.windowLabel,
      lead_time_min: EVENT.leadTimeMin,
      state: EVENT.state,
      confidence_pct: EVENT.confidencePct,
      uncertainty_min: EVENT.uncertaintyMin,
      impact: EVENT.impact,
      factors: EVENT.factors,
      flood_context: EVENT.floodContext,
      predictor_version: "stub-0",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (eventError) throw new Error(`seed events failed: ${eventError.message}`);

  const recRows = EVENT.recommendations.map((rec) => ({
    id: deriveRecommendationId(eventId, rec.owner, rec.priority),
    event_id: eventId,
    owner_agency: rec.owner,
    title: rec.title,
    detail: rec.detail,
    priority: rec.priority,
    status: rec.status,
    status_meta: rec.statusMeta ?? null,
    triggers_citizen_push: rec.triggersCitizenPush ?? false,
  }));
  const { error: recError } = await supabase
    .from("recommendations")
    .upsert(recRows, { onConflict: "id" });
  if (recError) throw new Error(`seed recommendations failed: ${recError.message}`);

  const { error: clearTimelineError } = await supabase
    .from("timeline_snapshots")
    .delete()
    .eq("event_id", eventId);
  if (clearTimelineError) {
    throw new Error(`clear timeline_snapshots failed: ${clearTimelineError.message}`);
  }

  const timelineRows = EVENT.timeline.map((snap) => ({
    event_id: eventId,
    time_label: snap.time,
    clock_minutes: snap.clockMinutes,
    state: snap.state,
    advisory: snap.advisory,
    citizen_headline: snap.citizenHeadline,
    confidence_pct: snap.confidencePct,
  }));
  const { error: timelineError } = await supabase.from("timeline_snapshots").insert(timelineRows);
  if (timelineError) throw new Error(`seed timeline_snapshots failed: ${timelineError.message}`);

  const { error: outcomeError } = await supabase.from("outcomes").upsert(
    {
      event_id: eventId,
      flagged_at: EVENT.outcome.flaggedAt,
      actual_peak_delay_min: EVENT.outcome.actualPeakDelayMin,
      predicted_range: EVENT.outcome.predictedRange,
      within_prediction: EVENT.outcome.withinPrediction,
      avoided_person_min: EVENT.outcome.avoidedPersonMin,
      baseline_note: EVENT.outcome.baselineNote,
    },
    { onConflict: "event_id" }
  );
  if (outcomeError) throw new Error(`seed outcomes failed: ${outcomeError.message}`);

  console.log(
    `[seed-event] done: ${eventId} (${recRows.length} recommendations, ${timelineRows.length} timeline snapshots, 1 outcome)`
  );
}

main().catch((err) => {
  console.error("[seed-event] failed:", err);
  process.exit(1);
});
