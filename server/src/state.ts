// In-memory mutable state for the Bengaluru Pulse server.
// No database - a single process holds a working copy of the canonical scenario
// plus whatever push tokens have registered during this run.

import { EVENT } from "../../shared/scenario";
import type { PulseEvent, Recommendation } from "../../shared/types";

// Deep-clone the canonical scenario so we can mutate recommendation status
// (approve / advisory-send) without touching the shared source of truth.
export const event: PulseEvent = JSON.parse(JSON.stringify(EVENT)) as PulseEvent;

export function findRecommendation(id: string): Recommendation | undefined {
  return event.recommendations.find((r) => r.id === id);
}

// Registered Expo push tokens, deduplicated. Kept alongside an optional area
// label from the last registration for that token.
interface PushTokenEntry {
  expoPushToken: string;
  area?: string;
}

const pushTokens: PushTokenEntry[] = [];

export function registerPushToken(expoPushToken: string, area?: string): number {
  const existing = pushTokens.find((t) => t.expoPushToken === expoPushToken);
  if (existing) {
    if (area) existing.area = area;
  } else {
    pushTokens.push({ expoPushToken, area });
  }
  return pushTokens.length;
}

export function getPushTokens(): string[] {
  return pushTokens.map((t) => t.expoPushToken);
}

export function tokenCount(): number {
  return pushTokens.length;
}
