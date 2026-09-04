// Bengaluru Pulse - canonical anchor scenario (illustrative data).
// Event #2026-0904-ORR-E: evening rain on ORR East, Silk Board -> Marathahalli.
// This is the single source of truth the server serves; console + mobile are pure clients.
// All numbers are illustrative for the pilot demo, not live measurements.

import type { PulseEvent, CitizenPulse } from "./types";

export const EVENT: PulseEvent = {
  id: "2026-0904-ORR-E",
  corridor: "ORR East - Silk Board to Marathahalli",
  windowLabel: "5:00-8:00 PM",
  leadTimeMin: 45,
  updatedAt: "4:15 PM",
  state: "delay",
  confidencePct: 72,
  uncertaintyMin: 15,
  impact: {
    addedTravelMin: [25, 40],
    peopleAffected: 120000,
    busRoutesExposed: 18,
    junctionsInSpread: 3,
  },
  factors: [
    { kind: "rain", label: "IMD nowcast:", detail: "heavy rain 4:30-6:30 PM" },
    { kind: "flood", label: "Historical waterlog:", detail: "Bellandur, Ecospace jn" },
    { kind: "traffic", label: "Live congestion:", detail: "index 0.6 and rising" },
  ],
  floodContext: {
    corridorNodes: [
      { name: "Silk Board", x: 0.12, y: 0.34 },
      { name: "Bellandur", x: 0.48, y: 0.52 },
      { name: "Marathahalli", x: 0.86, y: 0.64 },
    ],
    waterlogPins: [
      { name: "Bellandur", x: 0.44, y: 0.56 },
      { name: "Ecospace jn", x: 0.62, y: 0.48 },
    ],
    source:
      "ISRO Bhuvan satellite + terrain, Sentinel-2, historical waterlog records - context layer, not live imagery",
  },
  recommendations: [
    {
      id: "rec-btp-ecospace",
      owner: "BTP",
      title: "Deploy field staff at Ecospace junction",
      detail: "Divert + manage merge - priority 1",
      priority: 1,
      status: "pending",
    },
    {
      id: "rec-gba-pumps",
      owner: "GBA",
      title: "Pre-position drainage pumps at Bellandur",
      detail: "Clear known choke drains",
      priority: 2,
      status: "acknowledged",
      statusMeta: "Acknowledged 4:22",
    },
    {
      id: "rec-bmtc-reroute",
      owner: "BMTC",
      title: "Reroute 500-series buses",
      detail: "Avoid submerged underpass",
      priority: 3,
      status: "awaiting",
      statusMeta: "Awaiting response",
    },
    {
      id: "rec-dult-advisory",
      owner: "DULT",
      title: "Push citizen advisory (WhatsApp)",
      detail: "East Bengaluru opt-in list",
      priority: 4,
      status: "sent",
      statusMeta: "Sent 4:15 - 38k reached",
      triggersCitizenPush: true,
    },
  ],
  outcome: {
    flaggedAt: "4:15 PM",
    actualPeakDelayMin: 31,
    predictedRange: [25, 40],
    withinPrediction: true,
    avoidedPersonMin: 14000,
    baselineNote: "matched-baseline vs similar rain events on this corridor - estimate, not RCT-grade",
  },
  timeline: [
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
      advisory:
        "Rain easing. Congestion clearing slowly on ORR East. Expect residual delays of 15-20 min.",
      confidencePct: 70,
    },
  ],
};

/** Derive the citizen subset for a given moment (defaults to the current updatedAt snapshot). */
export function toCitizenPulse(
  event: PulseEvent,
  atClockMinutes?: number
): CitizenPulse {
  const snap =
    (atClockMinutes != null
      ? [...event.timeline]
          .reverse()
          .find((s) => s.clockMinutes <= atClockMinutes)
      : event.timeline.find((s) => s.time === event.updatedAt)) ??
    event.timeline[event.timeline.length - 1];

  return {
    eventId: event.id,
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
    timeline: event.timeline,
  };
}
