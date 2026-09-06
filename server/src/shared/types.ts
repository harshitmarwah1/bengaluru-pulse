// Vendored copy of /shared/types.ts - keep in sync with the repo-root canonical. See docs/WAVE-1-BUILD-BRIEF.md.
// Bengaluru Pulse - shared domain types.
// Single source of truth for the shapes that flow across server -> console + mobile.
// Kept dependency-free so any package can import or copy it.

export type RiskState = "normal" | "delay" | "disruption";

export type Agency = "DULT" | "BTP" | "GBA" | "BMTC";

export type RecommendationStatus =
  | "pending" // not yet approved/assigned
  | "awaiting" // assigned, waiting on the agency
  | "acknowledged" // agency acknowledged
  | "sent" // action executed / advisory delivered
  | "acted"; // agency acted (field confirmation)

export interface ContributingFactor {
  /** short glyph shown in the console factor list, e.g. "rain" | "flood" | "traffic" */
  kind: "rain" | "flood" | "traffic" | "event";
  label: string; // bolded lead, e.g. "IMD nowcast:"
  detail: string; // e.g. "heavy rain 4:30-6:30 PM"
}

export interface CorridorNode {
  name: string; // "Silk Board" | "Bellandur" | "Marathahalli"
  /** normalized 0..1 position on the flood-context map */
  x: number;
  y: number;
}

export interface WaterlogPin {
  name: string; // "Bellandur", "Ecospace jn"
  x: number; // normalized 0..1
  y: number;
}

export interface FloodContext {
  corridorNodes: CorridorNode[];
  waterlogPins: WaterlogPin[];
  /** provenance string shown under the map */
  source: string;
}

export interface Impact {
  addedTravelMin: [number, number]; // e.g. [25, 40]
  peopleAffected: number; // e.g. 120000
  busRoutesExposed: number; // e.g. 18
  junctionsInSpread: number; // e.g. 3
}

export interface Recommendation {
  id: string; // "rec-btp-ecospace"
  owner: Agency;
  title: string; // "Deploy field staff at Ecospace junction"
  detail: string; // "Divert + manage merge"
  priority: number; // 1 = highest
  status: RecommendationStatus;
  /** human-readable status meta, e.g. "Acknowledged 4:22" | "38k reached" */
  statusMeta?: string;
  /** true if this recommendation triggers a citizen push when approved (the DULT advisory) */
  triggersCitizenPush?: boolean;
}

export interface Outcome {
  flaggedAt: string; // "4:15 PM"
  actualPeakDelayMin: number; // 31
  predictedRange: [number, number]; // [25, 40]
  withinPrediction: boolean;
  avoidedPersonMin: number; // 14000
  baselineNote: string; // "matched-baseline estimate, not RCT-grade"
}

/** One snapshot in the event timeline - drives the citizen scrubber + console replay. */
export interface TimelineSnapshot {
  time: string; // "4:15 PM"
  clockMinutes: number; // minutes since midnight, for ordering/scrubbing (e.g. 855)
  state: RiskState;
  /** citizen-facing advisory at this moment */
  advisory: string;
  /** headline for the citizen card, e.g. "Delay Risk" */
  citizenHeadline: string;
  confidencePct: number;
}

/** The full risk event - everything the agency console renders. */
export interface PulseEvent {
  id: string; // "2026-0904-ORR-E"
  corridor: string; // "ORR East - Silk Board to Marathahalli"
  windowLabel: string; // "5:00-8:00 PM"
  leadTimeMin: number; // 45
  updatedAt: string; // "4:15 PM"
  state: RiskState; // current headline state
  confidencePct: number; // 72
  uncertaintyMin: number; // 15
  impact: Impact;
  factors: ContributingFactor[];
  floodContext: FloodContext;
  recommendations: Recommendation[];
  outcome: Outcome;
  timeline: TimelineSnapshot[];
}

/** The citizen subset - everything the mobile Pulse card renders. */
export interface CitizenPulse {
  eventId: string;
  state: RiskState;
  headline: string; // "Delay Risk"
  advisory: string; // full advisory sentence
  actions: { kind: "time" | "metro"; text: string }[];
  area: { name: string; floodProne: "Low" | "Medium" | "High" };
  updatedAt: string; // "4:15 PM"
  channel: "WhatsApp"; // pilot channel label
  timeline: TimelineSnapshot[];
}

/** Push registration payload from the mobile app. */
export interface PushRegistration {
  expoPushToken: string;
  area?: string; // "Marathahalli"
}

/** Push message the server sends to a registered device. */
export interface PushMessage {
  title: string; // "Bengaluru Pulse: Delay Risk"
  body: string; // the advisory
  data: { eventId: string; state: RiskState };
}
