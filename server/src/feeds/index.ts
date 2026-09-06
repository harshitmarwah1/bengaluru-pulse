// Bengaluru Pulse - feed adapter bundle.
// One adapter per FeedSource, each picked live-vs-stub by its own factory.
// This is the single place the ingestion worker (and tests) get adapters from.

import type { FeedAdapter, FeedSource, ReadingPayload } from "../shared/feeds";
import { createTrafficAdapter } from "./traffic";
import { createRainAdapter } from "./rain";
import { createBusAdapter } from "./bus";
import { createMetroAdapter } from "./metro";
import { createFloodAdapter } from "./flood";
import { createPopulationAdapter } from "./population";

export type FeedAdapterBundle = Record<FeedSource, FeedAdapter<ReadingPayload>>;

/** Builds the full set of feed adapters, each live if its env key is set, else stub. */
export function createFeedAdapters(): FeedAdapterBundle {
  return {
    traffic: createTrafficAdapter(),
    rain: createRainAdapter(),
    bus: createBusAdapter(),
    metro: createMetroAdapter(),
    flood: createFloodAdapter(),
    population: createPopulationAdapter(),
  };
}

export * from "./traffic";
export * from "./rain";
export * from "./bus";
export * from "./metro";
export * from "./flood";
export * from "./population";
