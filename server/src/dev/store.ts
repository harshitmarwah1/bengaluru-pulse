// Bengaluru Pulse - DEV-ONLY in-memory data store (see dev/mode.ts).
// Serves the canonical shared/scenario.ts event so the UI can be reviewed with
// no Supabase. A single mutable clone is kept for the process lifetime so that
// officer actions (approve, advisory-send) visibly persist across refetches
// within a dev session. Never used unless DEV_UNAUTHED is on.
import { EVENT } from "../shared/scenario";
import type { PulseEvent, Recommendation, RecommendationStatus } from "../shared/types";

// Deep clone so status mutations never touch the frozen canonical scenario.
const event: PulseEvent = structuredClone(EVENT);

export function devListEvents(corridorId?: string): PulseEvent[] {
  // Single-corridor pilot scenario; a corridor filter either matches or empties.
  if (corridorId && corridorId !== "orr-east") return [];
  return [event];
}

export function devGetEventById(id: string): PulseEvent | null {
  return id === event.id ? event : null;
}

export function devGetLatestForCorridor(corridorId: string): PulseEvent | null {
  return corridorId === "orr-east" ? event : null;
}

export function devFindRecommendation(
  id: string
): { recommendation: Recommendation; eventId: string; corridorId: string } | null {
  const recommendation = event.recommendations.find((r) => r.id === id);
  if (!recommendation) return null;
  return { recommendation, eventId: event.id, corridorId: "orr-east" };
}

export function devUpdateRecommendation(
  id: string,
  status: RecommendationStatus,
  statusMeta?: string
): Recommendation {
  const rec = event.recommendations.find((r) => r.id === id);
  if (!rec) throw new Error(`dev store: no recommendation '${id}'`);
  rec.status = status;
  rec.statusMeta = statusMeta;
  return rec;
}
