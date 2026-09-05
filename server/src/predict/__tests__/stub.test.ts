import { describe, expect, it } from "vitest";
import { StubPredictor } from "../stub";
import { EVENT } from "../../../../shared/scenario";

describe("StubPredictor", () => {
  it("is stamped with version stub-0", () => {
    expect(new StubPredictor().version).toBe("stub-0");
  });

  it("reproduces the canonical ORR scenario numbers for the pilot corridor", async () => {
    const predictor = new StubPredictor();
    const predicted = await predictor.predict({
      corridorId: "orr-east",
      corridorName: EVENT.corridor,
      readings: {},
      at: "2026-09-04T16:15:00.000+05:30",
    });

    expect(predicted.state).toBe(EVENT.state);
    expect(predicted.confidencePct).toBe(EVENT.confidencePct);
    expect(predicted.uncertaintyMin).toBe(EVENT.uncertaintyMin);
    expect(predicted.leadTimeMin).toBe(EVENT.leadTimeMin);
    expect(predicted.windowLabel).toBe(EVENT.windowLabel);
    expect(predicted.impact).toEqual(EVENT.impact);
    expect(predicted.factors).toEqual(EVENT.factors);
    expect(predicted.timeline).toEqual(EVENT.timeline);
  });

  it("strips id/status/statusMeta from recommendations but keeps their content", async () => {
    const predictor = new StubPredictor();
    const predicted = await predictor.predict({
      corridorId: "orr-east",
      corridorName: EVENT.corridor,
      readings: {},
      at: "2026-09-04T16:15:00.000+05:30",
    });

    expect(predicted.recommendations).toHaveLength(EVENT.recommendations.length);
    predicted.recommendations.forEach((rec, i) => {
      expect(rec).not.toHaveProperty("id");
      expect(rec).not.toHaveProperty("status");
      expect(rec).not.toHaveProperty("statusMeta");
      expect(rec.owner).toBe(EVENT.recommendations[i].owner);
      expect(rec.title).toBe(EVENT.recommendations[i].title);
      expect(rec.priority).toBe(EVENT.recommendations[i].priority);
    });
  });

  it("ignores readings for the pilot corridor - it always reproduces the demo scenario", async () => {
    const predictor = new StubPredictor();
    const withReadings = await predictor.predict({
      corridorId: "orr-east",
      corridorName: EVENT.corridor,
      readings: {
        traffic: {
          source: "traffic",
          corridorId: "orr-east",
          payload: { congestionIndex: 0.1, addedTravelMin: [1, 2], rising: false },
          observedAt: new Date().toISOString(),
        },
      },
      at: new Date().toISOString(),
    });
    expect(withReadings.state).toBe(EVENT.state);
    expect(withReadings.impact).toEqual(EVENT.impact);
  });

  it("falls back to a minimal normal event for a non-pilot corridor", async () => {
    const predictor = new StubPredictor();
    const predicted = await predictor.predict({
      corridorId: "some-other-corridor",
      corridorName: "Some Other Corridor",
      readings: {},
      at: "2026-09-04T16:15:00.000+05:30",
    });

    expect(predicted.state).toBe("normal");
    expect(predicted.recommendations).toEqual([]);
    expect(predicted.timeline).toHaveLength(1);
  });

  it("uses available readings to fill the fallback event's impact for a non-pilot corridor", async () => {
    const predictor = new StubPredictor();
    const predicted = await predictor.predict({
      corridorId: "some-other-corridor",
      corridorName: "Some Other Corridor",
      readings: {
        traffic: {
          source: "traffic",
          corridorId: "some-other-corridor",
          payload: { congestionIndex: 0.2, addedTravelMin: [3, 6], rising: false },
          observedAt: new Date().toISOString(),
        },
        population: {
          source: "population",
          corridorId: "some-other-corridor",
          payload: { peopleAffected: 500 },
          observedAt: new Date().toISOString(),
        },
      },
      at: "2026-09-04T16:15:00.000+05:30",
    });

    expect(predicted.impact.addedTravelMin).toEqual([3, 6]);
    expect(predicted.impact.peopleAffected).toBe(500);
  });
});
