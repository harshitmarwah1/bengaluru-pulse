// Bengaluru Pulse - feed ingestion contract (Wave 0 foundation).
// Every live source implements FeedAdapter. Adapters normalize a source into a
// typed reading; the ingestion worker persists readings to feed_snapshots and
// the Predictor consumes them. A source with no credentials ships a `stub`
// adapter behind the SAME interface, so wiring a real key later is a drop-in.

export type FeedSource =
  | "traffic"
  | "rain"
  | "bus"
  | "metro"
  | "flood"
  | "population";

// --- Normalized payloads (what each adapter must produce) -------------------

export interface TrafficReading {
  congestionIndex: number; // 0..1, higher = worse
  addedTravelMin: [number, number]; // vs free-flow, on the corridor
  rising: boolean;
}

export interface RainReading {
  intensityMmHr: number;
  nowcastWindow?: string; // "4:30-6:30 PM"
  provider: string; // "KSNDMC" | "IMD"
}

export interface BusReading {
  routesExposed: number;
  routeIds: string[]; // BMTC route numbers on/near the corridor
}

export interface MetroReading {
  line: string; // "Purple Line"
  status: "normal" | "degraded" | "down";
  alternativeViable: boolean; // can it absorb diverted riders
}

export interface FloodReading {
  waterlogPins: { name: string; x: number; y: number }[];
  riskLevel: "Low" | "Medium" | "High";
}

export interface PopulationReading {
  peopleAffected: number; // corridor exposure estimate
}

export type ReadingPayload =
  | TrafficReading
  | RainReading
  | BusReading
  | MetroReading
  | FloodReading
  | PopulationReading;

export interface FeedReading<T extends ReadingPayload = ReadingPayload> {
  source: FeedSource;
  corridorId: string;
  payload: T;
  observedAt: string; // ISO 8601 - when the source measured it
}

// --- The adapter contract ---------------------------------------------------

export interface FeedAdapter<T extends ReadingPayload = ReadingPayload> {
  readonly source: FeedSource;
  /** "live" = talks to the real source with a configured key; "stub" = deterministic placeholder. */
  readonly mode: "live" | "stub";
  /**
   * Pull the latest reading for a corridor.
   * Returns null when the source is temporarily unavailable (ingestion skips, keeps last snapshot).
   * Must never throw for an expected outage - throw only on misconfiguration.
   */
  fetch(corridorId: string): Promise<FeedReading<T> | null>;
}

/** A source-keyed bundle of the latest readings, passed to the Predictor. */
export type LatestReadings = Partial<Record<FeedSource, FeedReading>>;
