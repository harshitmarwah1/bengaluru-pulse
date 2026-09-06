// Bengaluru Pulse - bus feed adapter (source: "bus").
// Live: BMTC GTFS-realtime feed, decoded with the standard GTFS-realtime
// protobuf schema (gtfs-realtime-bindings) - the open transit standard, not a
// guessed BMTC-specific shape. Static GTFS (BMTC_GTFS_URL alone) has no
// real-time trip/vehicle data to compute exposure from, so "live" mode needs
// BMTC_GTFS_RT_URL specifically (needs BMTC ITS access per server/.env.example).
// Stub: deterministic ORR-shaped reading so the pipeline works with zero keys.

import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import type { FeedAdapter, FeedReading, BusReading } from "../shared/feeds";

const BUS_STUB_BY_CORRIDOR: Record<string, BusReading> = {
  "orr-east": {
    routesExposed: 18,
    routeIds: Array.from({ length: 18 }, (_, i) => `500${String.fromCharCode(65 + (i % 26))}`),
  },
};

const BUS_STUB_DEFAULT: BusReading = { routesExposed: 0, routeIds: [] };

// Route-id prefixes considered "exposed" per corridor - the 500-series runs
// the ORR East stretch (matches the "Reroute 500-series buses" recommendation
// in the canonical scenario).
const CORRIDOR_ROUTE_PREFIXES: Record<string, string[]> = {
  "orr-east": ["500"],
};

export class BusLiveAdapter implements FeedAdapter<BusReading> {
  readonly source = "bus" as const;
  readonly mode = "live" as const;

  constructor(private readonly feedUrl: string) {}

  async fetch(corridorId: string): Promise<FeedReading<BusReading> | null> {
    const prefixes = CORRIDOR_ROUTE_PREFIXES[corridorId];
    if (!prefixes) return null; // no known route mapping for this corridor yet

    let buffer: ArrayBuffer;
    try {
      const res = await fetch(this.feedUrl);
      if (!res.ok) return null; // upstream outage - expected, keep last snapshot
      buffer = await res.arrayBuffer();
    } catch {
      return null;
    }

    let feed;
    try {
      feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
    } catch {
      return null; // malformed/empty feed - treat as a temporary outage
    }

    const routeIds = new Set<string>();
    for (const entity of feed.entity ?? []) {
      const routeId = entity.tripUpdate?.trip?.routeId ?? entity.vehicle?.trip?.routeId;
      if (routeId && prefixes.some((p) => routeId.startsWith(p))) {
        routeIds.add(routeId);
      }
    }

    return {
      source: "bus",
      corridorId,
      payload: { routesExposed: routeIds.size, routeIds: [...routeIds].sort() },
      observedAt: new Date().toISOString(),
    };
  }
}

export class BusStubAdapter implements FeedAdapter<BusReading> {
  readonly source = "bus" as const;
  readonly mode = "stub" as const;

  async fetch(corridorId: string): Promise<FeedReading<BusReading> | null> {
    return {
      source: "bus",
      corridorId,
      payload: BUS_STUB_BY_CORRIDOR[corridorId] ?? BUS_STUB_DEFAULT,
      observedAt: new Date().toISOString(),
    };
  }
}

/** Live if BMTC_GTFS_RT_URL is set, else the deterministic stub. */
export function createBusAdapter(): FeedAdapter<BusReading> {
  const rtUrl = process.env.BMTC_GTFS_RT_URL;
  return rtUrl ? new BusLiveAdapter(rtUrl) : new BusStubAdapter();
}
