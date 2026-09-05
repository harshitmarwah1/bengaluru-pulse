// Thin Amplitude Browser SDK wrapper for the officer event taxonomy
// (shared/analytics-events.ts). Behavioral analytics only - domain KPIs live
// in Supabase, not Amplitude (see that file's header comment).
//
// VITE_AMPLITUDE_API_KEY may be unset in local/dev environments with no live
// Amplitude project. init()/track() no-op cleanly in that case so the console
// never crashes or blocks on a missing key.
import * as amplitude from "@amplitude/analytics-browser";
import { OFFICER_EVENTS, type OfficerEvent } from "../../../shared/analytics-events";

const API_KEY = import.meta.env.VITE_AMPLITUDE_API_KEY as string | undefined;

let ready = false;

export function initAnalytics(): void {
  if (!API_KEY || ready) return;
  try {
    amplitude.init(API_KEY, {
      defaultTracking: { pageViews: false, sessions: true, formInteractions: false, fileDownloads: false },
    });
    ready = true;
  } catch (err) {
    console.error("Amplitude init failed", err);
  }
}

/** Associate subsequent events with the signed-in officer, or clear on sign-out. */
export function setAnalyticsUser(userId: string | undefined): void {
  if (!ready) return;
  try {
    if (userId) amplitude.setUserId(userId);
    else amplitude.reset();
  } catch (err) {
    console.error("Amplitude setUserId failed", err);
  }
}

export function track(event: OfficerEvent, props?: Record<string, unknown>): void {
  if (!ready) return;
  try {
    amplitude.track(event, props);
  } catch (err) {
    console.error("Amplitude track failed", event, err);
  }
}

export { OFFICER_EVENTS };
