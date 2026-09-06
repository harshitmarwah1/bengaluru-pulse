// Bengaluru Pulse - events/recommendations data access.
// Maps the Supabase schema (supabase/migrations/0001_init.sql) onto the shared
// PulseEvent/Recommendation/TimelineSnapshot/Outcome shapes (shared/types.ts).
// Column names are snake_case in Postgres, camelCase in the shared types - this
// module is the one place that bridges the two.

import { getSupabase } from "./client";
import { formatClockIso } from "./format";
import type {
  Agency,
  ContributingFactor,
  FloodContext,
  Impact,
  Outcome,
  PulseEvent,
  Recommendation,
  RecommendationStatus,
  RiskState,
  TimelineSnapshot,
} from "../shared/types";

// --- Row shapes as returned by PostgREST (snake_case) -----------------------

interface CorridorRow {
  name: string;
}

interface RecommendationRow {
  id: string;
  owner_agency: string;
  title: string;
  detail: string;
  priority: number;
  status: string;
  status_meta: string | null;
  triggers_citizen_push: boolean;
}

interface TimelineRow {
  time_label: string;
  clock_minutes: number;
  state: string;
  advisory: string;
  citizen_headline: string;
  confidence_pct: number;
}

interface OutcomeRow {
  flagged_at: string;
  actual_peak_delay_min: number | null;
  predicted_range: number[];
  within_prediction: boolean | null;
  avoided_person_min: number | null;
  baseline_note: string;
}

interface EventRow {
  id: string;
  corridor_id: string;
  window_label: string;
  lead_time_min: number;
  state: string;
  confidence_pct: number;
  uncertainty_min: number;
  impact: Impact;
  factors: ContributingFactor[];
  flood_context: FloodContext;
  updated_at: string;
  created_at: string;
  corridors: CorridorRow | CorridorRow[] | null;
  recommendations: RecommendationRow[] | null;
  timeline_snapshots: TimelineRow[] | null;
  outcomes: OutcomeRow | OutcomeRow[] | null;
}

interface RecommendationWithEventRow extends RecommendationRow {
  event_id: string;
  events: { corridor_id: string } | { corridor_id: string }[] | null;
}

// PostgREST embeds a to-one relation as a single object and a to-many relation
// as an array, but which one you get for a given FK direction is easy to get
// subtly wrong - this helper accepts either so a schema-driver quirk can't
// silently turn into an empty event.
function firstOrSelf<T>(v: T | T[] | null | undefined): T | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

const EVENT_SELECT = `
  id, corridor_id, window_label, lead_time_min, state, confidence_pct, uncertainty_min,
  impact, factors, flood_context, updated_at, created_at,
  corridors ( name ),
  recommendations ( id, owner_agency, title, detail, priority, status, status_meta, triggers_citizen_push ),
  timeline_snapshots ( time_label, clock_minutes, state, advisory, citizen_headline, confidence_pct ),
  outcomes ( flagged_at, actual_peak_delay_min, predicted_range, within_prediction, avoided_person_min, baseline_note )
`;

const RECOMMENDATION_SELECT =
  "id, owner_agency, title, detail, priority, status, status_meta, triggers_citizen_push";

function mapRecommendation(r: RecommendationRow): Recommendation {
  return {
    id: r.id,
    owner: r.owner_agency as Agency,
    title: r.title,
    detail: r.detail,
    priority: r.priority,
    status: r.status as RecommendationStatus,
    statusMeta: r.status_meta ?? undefined,
    triggersCitizenPush: r.triggers_citizen_push || undefined,
  };
}

function mapTimeline(t: TimelineRow): TimelineSnapshot {
  return {
    time: t.time_label,
    clockMinutes: t.clock_minutes,
    state: t.state as RiskState,
    advisory: t.advisory,
    citizenHeadline: t.citizen_headline,
    confidencePct: t.confidence_pct,
  };
}

// events.outcome is required by PulseEvent, but the outcomes table row only
// exists once an event's window has actually played out ("outcomes are
// measured post-window from the traffic feed" - API_CONTRACT.md). Until then
// we return an honest placeholder rather than fabricate a result.
const PENDING_OUTCOME_NOTE = "Outcome pending - the event window has not completed yet.";

function mapOutcome(o: OutcomeRow | undefined, impact: Impact, updatedAt: string): Outcome {
  if (!o) {
    return {
      flaggedAt: updatedAt,
      actualPeakDelayMin: 0,
      predictedRange: impact.addedTravelMin,
      withinPrediction: false,
      avoidedPersonMin: 0,
      baselineNote: PENDING_OUTCOME_NOTE,
    };
  }
  const [lo, hi] = o.predicted_range;
  return {
    flaggedAt: o.flagged_at,
    actualPeakDelayMin: o.actual_peak_delay_min ?? 0,
    predictedRange: [lo ?? 0, hi ?? 0],
    withinPrediction: o.within_prediction ?? false,
    avoidedPersonMin: o.avoided_person_min ?? 0,
    baselineNote: o.baseline_note,
  };
}

function mapEventRow(row: EventRow): PulseEvent {
  const corridor = firstOrSelf(row.corridors);
  const updatedAt = formatClockIso(row.updated_at);

  const recommendations = (row.recommendations ?? [])
    .slice()
    .sort((a, b) => a.priority - b.priority)
    .map(mapRecommendation);

  const timeline = (row.timeline_snapshots ?? [])
    .slice()
    .sort((a, b) => a.clock_minutes - b.clock_minutes)
    .map(mapTimeline);

  return {
    id: row.id,
    corridor: corridor?.name ?? row.corridor_id,
    windowLabel: row.window_label,
    leadTimeMin: row.lead_time_min,
    updatedAt,
    state: row.state as RiskState,
    confidencePct: row.confidence_pct,
    uncertaintyMin: row.uncertainty_min,
    impact: row.impact,
    factors: row.factors,
    floodContext: row.flood_context,
    recommendations,
    outcome: mapOutcome(firstOrSelf(row.outcomes), row.impact, updatedAt),
    timeline,
  };
}

export async function getEventById(id: string): Promise<PulseEvent | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapEventRow(data as unknown as EventRow);
}

export async function getLatestEventForCorridor(corridorId: string): Promise<PulseEvent | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("corridor_id", corridorId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapEventRow(data as unknown as EventRow);
}

/**
 * One event per active corridor - the most recent row for each corridor_id.
 * PostgREST has no DISTINCT ON, so this leans on the (corridor_id, created_at
 * desc) index the schema already provides: pull rows in that same order and
 * keep the first (= most recent) per corridor in application code. Fine at
 * pilot scale (a handful of corridors); revisit with a DB view/RPC if the
 * events table grows large enough for this to matter.
 */
export async function listLatestEvents(corridorId?: string): Promise<PulseEvent[]> {
  if (corridorId) {
    const event = await getLatestEventForCorridor(corridorId);
    return event ? [event] : [];
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .order("corridor_id", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;

  const seen = new Set<string>();
  const latest: PulseEvent[] = [];
  for (const row of (data ?? []) as unknown as EventRow[]) {
    if (seen.has(row.corridor_id)) continue;
    seen.add(row.corridor_id);
    latest.push(mapEventRow(row));
  }
  return latest;
}

export interface RecommendationLookup {
  recommendation: Recommendation;
  eventId: string;
  corridorId: string;
}

export async function getRecommendationById(id: string): Promise<RecommendationLookup | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("recommendations")
    .select(`${RECOMMENDATION_SELECT}, event_id, events ( corridor_id )`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as RecommendationWithEventRow;
  const eventRel = firstOrSelf(row.events);
  return {
    recommendation: mapRecommendation(row),
    eventId: row.event_id,
    corridorId: eventRel?.corridor_id ?? "",
  };
}

export async function updateRecommendationStatus(
  id: string,
  status: RecommendationStatus,
  statusMeta?: string
): Promise<Recommendation> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("recommendations")
    .update({ status, status_meta: statusMeta ?? null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(RECOMMENDATION_SELECT)
    .single();
  if (error) throw error;
  return mapRecommendation(data as unknown as RecommendationRow);
}
