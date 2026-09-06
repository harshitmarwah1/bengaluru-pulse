// Bengaluru Pulse - predictor stub (version "stub-0").
// Per the market-ready decision (see shared/predictor.ts): ship a pluggable
// stub now. For the pilot corridor it reproduces the canonical ORR East demo
// scenario (shared/scenario.ts) verbatim, so console + mobile look identical
// to the pilot demo before a real heuristic/ML model exists. For any other
// corridor it falls back to a minimal, honestly-uncertain "normal" event
// built from whatever readings are available - this is the seam a heuristic
// or ML Predictor implementation replaces later with zero API/DB changes.

import type { Predictor, PredictorInput, PredictedEvent } from "../shared/predictor";
import type { Recommendation } from "../shared/types";
import { EVENT } from "../shared/scenario";

const PILOT_CORRIDOR_ID = "orr-east";

function stripRecommendationMeta(
  rec: Recommendation
): Omit<Recommendation, "id" | "status" | "statusMeta"> {
  const { id: _id, status: _status, statusMeta: _statusMeta, ...rest } = rec;
  return rest;
}

function pilotPredictedEvent(): PredictedEvent {
  return {
    state: EVENT.state,
    confidencePct: EVENT.confidencePct,
    uncertaintyMin: EVENT.uncertaintyMin,
    leadTimeMin: EVENT.leadTimeMin,
    windowLabel: EVENT.windowLabel,
    impact: EVENT.impact,
    factors: EVENT.factors,
    floodContext: EVENT.floodContext,
    recommendations: EVENT.recommendations.map(stripRecommendationMeta),
    timeline: EVENT.timeline,
  };
}

/** A quiet fallback event for any corridor the stub doesn't have a named scenario for yet. */
function fallbackPredictedEvent(input: PredictorInput): PredictedEvent {
  const traffic = input.readings.traffic?.payload as
    | { congestionIndex: number; addedTravelMin: [number, number] }
    | undefined;
  const rain = input.readings.rain?.payload as { intensityMmHr: number } | undefined;
  const bus = input.readings.bus?.payload as { routesExposed: number } | undefined;
  const population = input.readings.population?.payload as { peopleAffected: number } | undefined;

  return {
    state: "normal",
    confidencePct: 40,
    uncertaintyMin: 20,
    leadTimeMin: 30,
    windowLabel: "No active window",
    impact: {
      addedTravelMin: traffic?.addedTravelMin ?? [0, 0],
      peopleAffected: population?.peopleAffected ?? 0,
      busRoutesExposed: bus?.routesExposed ?? 0,
      junctionsInSpread: 0,
    },
    factors: rain
      ? [{ kind: "rain", label: "Rain gauge:", detail: `${rain.intensityMmHr} mm/hr` }]
      : [],
    floodContext: { corridorNodes: [], waterlogPins: [], source: "No flood-context layer for this corridor yet." },
    recommendations: [],
    timeline: [
      {
        time: new Date(input.at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }),
        clockMinutes: clockMinutesOf(input.at),
        state: "normal",
        citizenHeadline: "Normal",
        advisory: `No significant disruption expected on ${input.corridorName}. Travel as usual.`,
        confidencePct: 40,
      },
    ],
  };
}

function clockMinutesOf(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export class StubPredictor implements Predictor {
  readonly version = "stub-0";

  async predict(input: PredictorInput): Promise<PredictedEvent> {
    return input.corridorId === PILOT_CORRIDOR_ID
      ? pilotPredictedEvent()
      : fallbackPredictedEvent(input);
  }
}
