// Bengaluru Pulse - traffic feed adapter (source: "traffic").
// Live: Google Maps Distance Matrix API (departure_time=now gives live-traffic duration).
// Stub: deterministic ORR-shaped reading so the pipeline works with zero keys.

import type { FeedAdapter, FeedReading, TrafficReading } from "../../../shared/feeds";

// Corridor endpoints for the Distance Matrix query. Only corridors we know the
// live adapter's origin/destination for can go "live" - anything else falls
// back to null (temporarily unavailable), never a throw.
const CORRIDOR_ENDPOINTS: Record<string, { origin: string; destination: string }> = {
  // ORR East: Silk Board Junction -> Marathahalli Junction.
  "orr-east": { origin: "12.9172,77.6229", destination: "12.9569,77.7011" },
};

// Deterministic stub reading, keyed by corridor. Values mirror the canonical
// ORR East demo scenario (shared/scenario.ts) so console + mobile look
// identical to the pilot demo with zero external keys configured.
const TRAFFIC_STUB_BY_CORRIDOR: Record<string, TrafficReading> = {
  "orr-east": { congestionIndex: 0.6, addedTravelMin: [25, 40], rising: true },
};

const TRAFFIC_STUB_DEFAULT: TrafficReading = {
  congestionIndex: 0.3,
  addedTravelMin: [5, 10],
  rising: false,
};

interface DistanceMatrixElement {
  status: string;
  duration?: { value: number };
  duration_in_traffic?: { value: number };
}

interface DistanceMatrixResponse {
  status: string;
  rows?: { elements: DistanceMatrixElement[] }[];
}

export class TrafficLiveAdapter implements FeedAdapter<TrafficReading> {
  readonly source = "traffic" as const;
  readonly mode = "live" as const;

  constructor(private readonly apiKey: string) {}

  async fetch(corridorId: string): Promise<FeedReading<TrafficReading> | null> {
    const endpoints = CORRIDOR_ENDPOINTS[corridorId];
    if (!endpoints) return null; // no known geometry for this corridor yet

    const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
    url.searchParams.set("origins", endpoints.origin);
    url.searchParams.set("destinations", endpoints.destination);
    url.searchParams.set("departure_time", "now");
    url.searchParams.set("key", this.apiKey);

    let json: DistanceMatrixResponse;
    try {
      const res = await fetch(url);
      if (!res.ok) return null; // upstream outage - keep last snapshot
      json = (await res.json()) as DistanceMatrixResponse;
    } catch {
      return null; // network failure - expected outage, not misconfiguration
    }

    const element = json.rows?.[0]?.elements?.[0];
    if (!element || element.status !== "OK" || !element.duration || !element.duration_in_traffic) {
      return null;
    }

    const freeFlowMin = element.duration.value / 60;
    const trafficMin = element.duration_in_traffic.value / 60;
    const addedMin = Math.max(0, trafficMin - freeFlowMin);

    // Distance Matrix gives one point-in-time reading, not a range - present a
    // +/-15% band around the point estimate to match the contract's [min,max]
    // shape until we track enough history to compute a real confidence band.
    const addedTravelMin: [number, number] = [
      Math.round(addedMin * 0.85),
      Math.round(addedMin * 1.15),
    ];

    // No prior-snapshot comparison available inside a single fetch - approximate
    // "rising" from the congestion ratio itself until ingestion wires in a
    // trend check against the previous feed_snapshots row for this corridor.
    const congestionIndex = Math.min(1, Math.max(0, freeFlowMin > 0 ? trafficMin / freeFlowMin - 1 : 0));

    return {
      source: "traffic",
      corridorId,
      payload: { congestionIndex, addedTravelMin, rising: congestionIndex > 0.5 },
      observedAt: new Date().toISOString(),
    };
  }
}

export class TrafficStubAdapter implements FeedAdapter<TrafficReading> {
  readonly source = "traffic" as const;
  readonly mode = "stub" as const;

  async fetch(corridorId: string): Promise<FeedReading<TrafficReading> | null> {
    return {
      source: "traffic",
      corridorId,
      payload: TRAFFIC_STUB_BY_CORRIDOR[corridorId] ?? TRAFFIC_STUB_DEFAULT,
      observedAt: new Date().toISOString(),
    };
  }
}

/** Live if GOOGLE_MAPS_API_KEY is set, else the deterministic stub. */
export function createTrafficAdapter(): FeedAdapter<TrafficReading> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  return apiKey ? new TrafficLiveAdapter(apiKey) : new TrafficStubAdapter();
}
