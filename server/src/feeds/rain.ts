// Bengaluru Pulse - rain feed adapter (source: "rain").
// Live: KSNDMC (Karnataka State Natural Disaster Monitoring Centre) rain gauges,
// falling back to IMD (India Meteorological Department) nowcast when only that
// key is configured. Neither agency publishes a public response schema (KSNDMC
// needs a state MoU) - the parsing below is a best-effort, defensively-coded
// mapping to update once real API docs/access are available.
// Stub: deterministic ORR-shaped reading so the pipeline works with zero keys.

import type { FeedAdapter, FeedReading, RainReading } from "../../../shared/feeds";

const RAIN_STUB_BY_CORRIDOR: Record<string, RainReading> = {
  "orr-east": { intensityMmHr: 18, nowcastWindow: "4:30-6:30 PM", provider: "IMD" },
};

const RAIN_STUB_DEFAULT: RainReading = { intensityMmHr: 0, provider: "IMD" };

type RainProvider = "KSNDMC" | "IMD";

interface RainLiveConfig {
  provider: RainProvider;
  url: string;
  apiKey: string;
}

// Best-effort field names pending real docs - both agencies are assumed to
// return a JSON payload with a rainfall figure and, optionally, a forecast
// window string.
interface RainApiResponse {
  mmHr?: number;
  rainfall_mm?: number;
  intensity?: number;
  nowcastWindow?: string;
  forecast_window?: string;
}

export class RainLiveAdapter implements FeedAdapter<RainReading> {
  readonly source = "rain" as const;
  readonly mode = "live" as const;

  constructor(private readonly config: RainLiveConfig) {}

  async fetch(corridorId: string): Promise<FeedReading<RainReading> | null> {
    const url = new URL(this.config.url);
    url.searchParams.set("corridor", corridorId);
    url.searchParams.set("key", this.config.apiKey);

    let json: RainApiResponse;
    try {
      const res = await fetch(url);
      if (!res.ok) return null; // upstream outage - expected, keep last snapshot
      json = (await res.json()) as RainApiResponse;
    } catch {
      return null;
    }

    const intensityMmHr = json.mmHr ?? json.rainfall_mm ?? json.intensity;
    if (typeof intensityMmHr !== "number" || Number.isNaN(intensityMmHr)) return null;

    return {
      source: "rain",
      corridorId,
      payload: {
        intensityMmHr,
        nowcastWindow: json.nowcastWindow ?? json.forecast_window,
        provider: this.config.provider,
      },
      observedAt: new Date().toISOString(),
    };
  }
}

export class RainStubAdapter implements FeedAdapter<RainReading> {
  readonly source = "rain" as const;
  readonly mode = "stub" as const;

  async fetch(corridorId: string): Promise<FeedReading<RainReading> | null> {
    return {
      source: "rain",
      corridorId,
      payload: RAIN_STUB_BY_CORRIDOR[corridorId] ?? RAIN_STUB_DEFAULT,
      observedAt: new Date().toISOString(),
    };
  }
}

/**
 * Live if a usable provider is configured: KSNDMC (URL + key) takes priority
 * as the primary state gauge network, falling back to IMD when only that key
 * is present. Else the deterministic stub.
 */
export function createRainAdapter(): FeedAdapter<RainReading> {
  const ksndmcUrl = process.env.KSNDMC_API_URL;
  const ksndmcKey = process.env.KSNDMC_API_KEY;
  if (ksndmcUrl && ksndmcKey) {
    return new RainLiveAdapter({ provider: "KSNDMC", url: ksndmcUrl, apiKey: ksndmcKey });
  }

  const imdKey = process.env.IMD_API_KEY;
  if (imdKey) {
    return new RainLiveAdapter({
      provider: "IMD",
      url: "https://mausam.imd.gov.in/api/nowcast",
      apiKey: imdKey,
    });
  }

  return new RainStubAdapter();
}
