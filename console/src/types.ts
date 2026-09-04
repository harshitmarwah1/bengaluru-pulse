// Re-export the shared domain types so the rest of the console imports from
// one local module instead of reaching across the package boundary everywhere.
export type {
  RiskState,
  Agency,
  RecommendationStatus,
  ContributingFactor,
  CorridorNode,
  WaterlogPin,
  FloodContext,
  Impact,
  Recommendation,
  Outcome,
  TimelineSnapshot,
  PulseEvent,
  CitizenPulse,
  PushRegistration,
  PushMessage,
} from "../../shared/types";
