import { describe, expect, it } from "vitest";
import { TrafficStubAdapter, createTrafficAdapter, TrafficLiveAdapter } from "../traffic";

describe("TrafficStubAdapter", () => {
  it("returns deterministic ORR-shaped readings for the pilot corridor", async () => {
    const adapter = new TrafficStubAdapter();
    const reading = await adapter.fetch("orr-east");

    expect(reading).not.toBeNull();
    expect(reading?.source).toBe("traffic");
    expect(reading?.corridorId).toBe("orr-east");
    expect(reading?.payload).toEqual({
      congestionIndex: 0.6,
      addedTravelMin: [25, 40],
      rising: true,
    });
  });

  it("is deterministic across repeated calls", async () => {
    const adapter = new TrafficStubAdapter();
    const first = await adapter.fetch("orr-east");
    const second = await adapter.fetch("orr-east");
    expect(first?.payload).toEqual(second?.payload);
  });

  it("falls back to a default reading for an unknown corridor", async () => {
    const adapter = new TrafficStubAdapter();
    const reading = await adapter.fetch("some-other-corridor");
    expect(reading?.payload.congestionIndex).toBe(0.3);
  });

  it("never throws, even for a nonsense corridor id", async () => {
    const adapter = new TrafficStubAdapter();
    await expect(adapter.fetch("")).resolves.not.toBeNull();
  });
});

describe("createTrafficAdapter factory", () => {
  it("picks the stub when GOOGLE_MAPS_API_KEY is unset", () => {
    const original = process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;
    try {
      const adapter = createTrafficAdapter();
      expect(adapter.mode).toBe("stub");
    } finally {
      if (original !== undefined) process.env.GOOGLE_MAPS_API_KEY = original;
    }
  });

  it("picks the live adapter when GOOGLE_MAPS_API_KEY is set", () => {
    const original = process.env.GOOGLE_MAPS_API_KEY;
    process.env.GOOGLE_MAPS_API_KEY = "test-key";
    try {
      const adapter = createTrafficAdapter();
      expect(adapter.mode).toBe("live");
      expect(adapter).toBeInstanceOf(TrafficLiveAdapter);
    } finally {
      if (original === undefined) delete process.env.GOOGLE_MAPS_API_KEY;
      else process.env.GOOGLE_MAPS_API_KEY = original;
    }
  });

  it("live adapter returns null for a corridor with no known endpoints (never throws)", async () => {
    const adapter = new TrafficLiveAdapter("test-key");
    await expect(adapter.fetch("unknown-corridor")).resolves.toBeNull();
  });
});
