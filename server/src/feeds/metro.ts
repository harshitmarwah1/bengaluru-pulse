// Bengaluru Pulse - metro feed adapter (source: "metro").
// Stub only for now (no BMRCL status feed wired up yet - BMRCL_STATUS_URL in
// server/.env.example is reserved for it). Deterministic ORR-shaped reading so
// the pipeline works with zero keys; same FeedAdapter interface a live BMRCL
// adapter will implement later - a drop-in swap via createMetroAdapter().

import type { FeedAdapter, FeedReading, MetroReading } from "../../../shared/feeds";

const METRO_STUB_BY_CORRIDOR: Record<string, MetroReading> = {
  "orr-east": { line: "Purple Line", status: "normal", alternativeViable: true },
};

const METRO_STUB_DEFAULT: MetroReading = {
  line: "Purple Line",
  status: "normal",
  alternativeViable: false,
};

export class MetroStubAdapter implements FeedAdapter<MetroReading> {
  readonly source = "metro" as const;
  readonly mode = "stub" as const;

  async fetch(corridorId: string): Promise<FeedReading<MetroReading> | null> {
    return {
      source: "metro",
      corridorId,
      payload: METRO_STUB_BY_CORRIDOR[corridorId] ?? METRO_STUB_DEFAULT,
      observedAt: new Date().toISOString(),
    };
  }
}

export function createMetroAdapter(): FeedAdapter<MetroReading> {
  return new MetroStubAdapter();
}
