// Bengaluru Pulse - flood feed adapter (source: "flood").
// Stub only for now (no live sensor feed wired up yet - FLOOD_SENSORS_URL in
// server/.env.example is reserved for it). Deterministic ORR-shaped reading,
// ported from the canonical scenario's flood context, so the pipeline works
// with zero keys; same FeedAdapter interface a live sensor adapter will
// implement later - a drop-in swap via createFloodAdapter().

import type { FeedAdapter, FeedReading, FloodReading } from "../shared/feeds";

const FLOOD_STUB_BY_CORRIDOR: Record<string, FloodReading> = {
  "orr-east": {
    waterlogPins: [
      { name: "Bellandur", x: 0.44, y: 0.56 },
      { name: "Ecospace jn", x: 0.62, y: 0.48 },
    ],
    riskLevel: "High",
  },
};

const FLOOD_STUB_DEFAULT: FloodReading = { waterlogPins: [], riskLevel: "Low" };

export class FloodStubAdapter implements FeedAdapter<FloodReading> {
  readonly source = "flood" as const;
  readonly mode = "stub" as const;

  async fetch(corridorId: string): Promise<FeedReading<FloodReading> | null> {
    return {
      source: "flood",
      corridorId,
      payload: FLOOD_STUB_BY_CORRIDOR[corridorId] ?? FLOOD_STUB_DEFAULT,
      observedAt: new Date().toISOString(),
    };
  }
}

export function createFloodAdapter(): FeedAdapter<FloodReading> {
  return new FloodStubAdapter();
}
