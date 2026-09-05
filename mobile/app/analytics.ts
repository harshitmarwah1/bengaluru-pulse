// Bengaluru Pulse (mobile) - Amplitude analytics.
//
// Instruments the CITIZEN_EVENTS taxonomy defined in ../../shared/analytics-events.ts. mobile/ is
// its own npm package (own package.json, own Metro bundling root) and per the project constraints
// only touches files under mobile/ - so, matching the same convention already used for
// app/types.ts (a local mirror of shared/types.ts), the event-name constants are copied here
// rather than imported across the package boundary. Keep CITIZEN_EVENTS below in lockstep with
// shared/analytics-events.ts.
//
// Amplitude only initializes when EXPO_PUBLIC_AMPLITUDE_API_KEY is set (see app/config.ts) - with
// no key every tracking call below is a no-op, so the app behaves identically in isolated dev /
// Expo Go without an Amplitude project. Every call is also wrapped so a bad key, no network, or a
// native-module hiccup can never crash the app - analytics is best-effort only.

import * as amplitude from "@amplitude/analytics-react-native";

import { AMPLITUDE_API_KEY } from "./config";
import type { RiskState } from "./types";

/** Mirrors shared/analytics-events.ts CITIZEN_EVENTS - see the note above. */
export const CITIZEN_EVENTS = {
  appOpened: "app_opened",
  pushReceived: "push_received",
  pushOpened: "push_opened",
  pulseViewed: "pulse_viewed", // props: state
  advisoryViewed: "advisory_viewed",
  actionTapped: "action_tapped", // props: kind ("time" | "metro")
  timelineScrubbed: "timeline_scrubbed",
} as const;

let initialized = false;

/** Call once at app start. No-ops (and logs nothing noisy) when no Amplitude key is configured. */
export function initAnalytics(): void {
  if (!AMPLITUDE_API_KEY || initialized) return;
  try {
    amplitude.init(AMPLITUDE_API_KEY, undefined, {
      autocapture: { sessions: true, appLifecycles: false, screenViews: false },
    });
    initialized = true;
  } catch (err) {
    console.warn(
      `[Bengaluru Pulse] Amplitude init failed (${err instanceof Error ? err.message : String(err)}) - ` +
        "analytics will no-op for this session."
    );
  }
}

function track(eventName: string, props?: Record<string, unknown>): void {
  if (!AMPLITUDE_API_KEY || !initialized) return;
  try {
    amplitude.track(eventName, props);
  } catch {
    // no-op: analytics must never crash the app
  }
}

export function trackAppOpened(): void {
  track(CITIZEN_EVENTS.appOpened);
}

export function trackPushReceived(): void {
  track(CITIZEN_EVENTS.pushReceived);
}

export function trackPushOpened(): void {
  track(CITIZEN_EVENTS.pushOpened);
}

export function trackPulseViewed(state: RiskState): void {
  track(CITIZEN_EVENTS.pulseViewed, { state });
}

export function trackAdvisoryViewed(): void {
  track(CITIZEN_EVENTS.advisoryViewed);
}

export function trackActionTapped(kind: "time" | "metro"): void {
  track(CITIZEN_EVENTS.actionTapped, { kind });
}

export function trackTimelineScrubbed(): void {
  track(CITIZEN_EVENTS.timelineScrubbed);
}
