// Bengaluru Pulse (mobile) - domain types.
//
// This mirrors the shapes in ../../shared/types.ts. mobile/ is its own npm package (own
// package.json, own Metro bundling root) and per the project constraints only touches
// files under mobile/, so the shared types are copied here rather than imported across the
// package boundary. Keep this file's shapes in lockstep with shared/types.ts - it is the
// binding contract in API_CONTRACT.md.

export type RiskState = "normal" | "delay" | "disruption";

export interface CitizenAction {
  kind: "time" | "metro";
  text: string;
}

export interface CitizenArea {
  name: string;
  floodProne: "Low" | "Medium" | "High";
}

/** One snapshot in the event timeline - drives the citizen scrubber. */
export interface TimelineSnapshot {
  time: string; // "4:15 PM"
  clockMinutes: number; // minutes since midnight, e.g. 855
  state: RiskState;
  advisory: string;
  citizenHeadline: string;
  confidencePct: number;
}

/** The citizen subset - everything the mobile Pulse card renders. GET /api/pulse response. */
export interface CitizenPulse {
  eventId: string;
  state: RiskState;
  headline: string;
  advisory: string;
  actions: CitizenAction[];
  area: CitizenArea;
  updatedAt: string;
  channel: "WhatsApp";
  timeline: TimelineSnapshot[];
}

/** Push registration payload sent to POST /api/push/register. */
export interface PushRegistration {
  expoPushToken: string;
  area?: string;
}

export interface PushRegistrationResponse {
  ok: boolean;
  registered: number;
}
