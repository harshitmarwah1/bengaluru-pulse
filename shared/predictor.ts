// Bengaluru Pulse - prediction contract (Wave 0 foundation).
// The Predictor turns the latest feed readings for a corridor into a risk event
// (state, confidence, impact, factors, recommendations, timeline, outcome).
//
// Per the market-ready decision: ship a PLUGGABLE STUB now behind this interface.
// A heuristic implementation (rain + congestion thresholds) or a trained ML model
// can replace it later with zero changes to the API, console, mobile, or DB - the
// only contract that matters is `Predictor`. The chosen impl's `version` string is
// stamped onto events.predictor_version for traceability.

import type {
  PulseEvent,
  Recommendation,
  ContributingFactor,
  FloodContext,
  Impact,
  TimelineSnapshot,
} from "./types";
import type { LatestReadings } from "./feeds";

export interface PredictorInput {
  corridorId: string;
  corridorName: string;
  readings: LatestReadings;
  at: string; // ISO 8601 - the moment being predicted for
}

/**
 * The Predictor's output. It is the event core the API persists; ids/timestamps
 * for the DB rows are assigned by the caller. `recommendations` carry no id yet
 * (the API mints them). This mirrors PulseEvent minus server-assigned fields.
 */
export interface PredictedEvent {
  state: PulseEvent["state"];
  confidencePct: number;
  uncertaintyMin: number;
  leadTimeMin: number;
  windowLabel: string;
  impact: Impact;
  factors: ContributingFactor[];
  floodContext: FloodContext;
  recommendations: Omit<Recommendation, "id" | "status" | "statusMeta">[];
  timeline: TimelineSnapshot[];
}

export interface Predictor {
  /** Stamped onto events.predictor_version, e.g. "stub-0", "heuristic-1", "ml-2024.09". */
  readonly version: string;
  predict(input: PredictorInput): Promise<PredictedEvent>;
}
