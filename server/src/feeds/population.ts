// Bengaluru Pulse - population feed adapter (source: "population").
// Stub only for now (no live census/mobility dataset wired up yet -
// POPULATION_DATASET_URL in server/.env.example is reserved for it).
// Deterministic ORR-shaped reading so the pipeline works with zero keys; same
// FeedAdapter interface a live dataset adapter will implement later - a
// drop-in swap via createPopulationAdapter().

import type { FeedAdapter, FeedReading, PopulationReading } from "../../../shared/feeds";

const POPULATION_STUB_BY_CORRIDOR: Record<string, PopulationReading> = {
  "orr-east": { peopleAffected: 120000 },
};

const POPULATION_STUB_DEFAULT: PopulationReading = { peopleAffected: 0 };

export class PopulationStubAdapter implements FeedAdapter<PopulationReading> {
  readonly source = "population" as const;
  readonly mode = "stub" as const;

  async fetch(corridorId: string): Promise<FeedReading<PopulationReading> | null> {
    return {
      source: "population",
      corridorId,
      payload: POPULATION_STUB_BY_CORRIDOR[corridorId] ?? POPULATION_STUB_DEFAULT,
      observedAt: new Date().toISOString(),
    };
  }
}

export function createPopulationAdapter(): FeedAdapter<PopulationReading> {
  return new PopulationStubAdapter();
}
