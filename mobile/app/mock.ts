// Bengaluru Pulse (mobile) - MOCK FALLBACK ONLY.
//
// This mirrors the citizen-facing subset of ../../shared/scenario.ts (event #2026-0904-ORR-E).
// It exists so the app still renders a correct-looking card when GET /api/pulse is unreachable
// (e.g. no server running yet during isolated dev, or a phone not on the same network as the
// dev machine). The real fetch in app/api.ts is always the primary code path - this is only the
// fallback, and every place it's used logs a clear "using mock" warning.

import type { CitizenPulse, TimelineSnapshot } from "./types";

export const MOCK_TIMELINE: TimelineSnapshot[] = [
  {
    time: "2:00 PM",
    clockMinutes: 840,
    state: "normal",
    citizenHeadline: "Normal",
    advisory: "No significant disruption expected on your corridor. Travel as usual.",
    confidencePct: 40,
  },
  {
    time: "3:00 PM",
    clockMinutes: 900,
    state: "normal",
    citizenHeadline: "Normal",
    advisory: "Light rain possible later. No disruption expected yet on ORR East.",
    confidencePct: 48,
  },
  {
    time: "4:15 PM",
    clockMinutes: 975,
    state: "delay",
    citizenHeadline: "Delay Risk",
    advisory:
      "Rain plus ORR congestion may add 25-40 min to east Bengaluru trips between 5-8 PM. Leave before 4:45 PM or take the Metro.",
    confidencePct: 72,
  },
  {
    time: "5:30 PM",
    clockMinutes: 1050,
    state: "delay",
    citizenHeadline: "Delay Risk",
    advisory:
      "Heavy rain now falling. Delays building on ORR East. If you can, wait 60-90 min or use the Purple Line Metro.",
    confidencePct: 80,
  },
  {
    time: "6:30 PM",
    clockMinutes: 1110,
    state: "disruption",
    citizenHeadline: "Disruption",
    advisory:
      "Waterlogging at Bellandur and Ecospace. ORR East severely congested. Avoid the corridor - defer travel or reroute via Metro.",
    confidencePct: 88,
  },
  {
    time: "8:00 PM",
    clockMinutes: 1200,
    state: "delay",
    citizenHeadline: "Delay Risk",
    advisory: "Rain easing. Congestion clearing slowly on ORR East. Expect residual delays of 15-20 min.",
    confidencePct: 70,
  },
];

/** Same shape as toCitizenPulse() in shared/scenario.ts, kept local for the mock fallback. */
export function mockCitizenPulse(atClockMinutes?: number): CitizenPulse {
  const snap =
    (atClockMinutes != null
      ? [...MOCK_TIMELINE].reverse().find((s) => s.clockMinutes <= atClockMinutes)
      : MOCK_TIMELINE.find((s) => s.time === "4:15 PM")) ?? MOCK_TIMELINE[MOCK_TIMELINE.length - 1];

  return {
    eventId: "2026-0904-ORR-E",
    state: snap.state,
    headline: snap.citizenHeadline,
    advisory: snap.advisory,
    actions: [
      { kind: "time", text: "Leave before 4:45 PM" },
      { kind: "metro", text: "Or take the Metro (Purple Line)" },
    ],
    area: { name: "Marathahalli", floodProne: "High" },
    updatedAt: snap.time,
    channel: "WhatsApp",
    timeline: MOCK_TIMELINE,
  };
}
