// Bengaluru Pulse - deterministic id helpers for predicted-event persistence.
// Shared by the periodic pipeline upsert and the one-off seed script so both
// write paths agree on the same primary keys and upsert onto the same rows
// instead of accumulating duplicates.

const PILOT_CORRIDOR_ID = "orr-east";
const PILOT_EVENT_ID = "2026-0904-ORR-E"; // matches shared/scenario.ts EVENT.id

/**
 * The events.id a predicted event for `corridorId` should be upserted onto.
 * The pilot corridor keeps the canonical scenario id so the periodic pipeline
 * converges onto the same row the seed script creates. Any other corridor
 * gets a stable placeholder until it has its own named scenario.
 */
export function deriveEventId(corridorId: string): string {
  return corridorId === PILOT_CORRIDOR_ID ? PILOT_EVENT_ID : `${corridorId}-current`;
}

/** Stable recommendations.id, scoped to (eventId, owner, priority) so re-running the predictor upserts rather than duplicates. */
export function deriveRecommendationId(eventId: string, owner: string, priority: number): string {
  return `${eventId}-rec-${priority}-${owner.toLowerCase()}`;
}
