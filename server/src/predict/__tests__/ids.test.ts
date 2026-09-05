import { describe, expect, it } from "vitest";
import { deriveEventId, deriveRecommendationId } from "../ids";

describe("deriveEventId", () => {
  it("uses the canonical scenario id for the pilot corridor", () => {
    expect(deriveEventId("orr-east")).toBe("2026-0904-ORR-E");
  });

  it("derives a stable placeholder id for any other corridor", () => {
    expect(deriveEventId("outer-north")).toBe("outer-north-current");
  });

  it("is deterministic", () => {
    expect(deriveEventId("orr-east")).toBe(deriveEventId("orr-east"));
  });
});

describe("deriveRecommendationId", () => {
  it("is stable for the same (eventId, owner, priority)", () => {
    const a = deriveRecommendationId("2026-0904-ORR-E", "BTP", 1);
    const b = deriveRecommendationId("2026-0904-ORR-E", "BTP", 1);
    expect(a).toBe(b);
  });

  it("differs when priority differs", () => {
    const a = deriveRecommendationId("2026-0904-ORR-E", "BTP", 1);
    const b = deriveRecommendationId("2026-0904-ORR-E", "BTP", 2);
    expect(a).not.toBe(b);
  });

  it("lowercases the owner", () => {
    expect(deriveRecommendationId("evt", "GBA", 2)).toBe("evt-rec-2-gba");
  });
});
