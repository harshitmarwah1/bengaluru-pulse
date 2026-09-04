// Bengaluru Pulse (mobile) - single point of API configuration.
//
// A physical phone cannot reach "localhost" (that resolves to the phone itself, not your dev
// machine), so API_BASE must be overridden to your dev machine's LAN IP whenever you test on a
// real device over Expo Go. The simulator/emulator can usually keep localhost.
//
// Wave 2: set the LAN IP one of two ways (checked in this order):
//   1. mobile/.env -> EXPO_PUBLIC_API_BASE=http://192.168.1.23:4000   (Metro inlines EXPO_PUBLIC_*
//      vars automatically - see https://docs.expo.dev/guides/environment-variables/)
//   2. mobile/app.json -> expo.extra.apiBase   (already present as a fallback default)
// Find your dev machine's LAN IP with `ipconfig getifaddr en0` (macOS Wi-Fi) or `ipconfig` (Windows).

import Constants from "expo-constants";

const FALLBACK_API_BASE = "http://localhost:4000";

const extraApiBase = Constants.expoConfig?.extra?.apiBase as string | undefined;

export const API_BASE: string =
  process.env.EXPO_PUBLIC_API_BASE?.trim() || extraApiBase?.trim() || FALLBACK_API_BASE;

/** The event window this scenario's timeline scrubber spans (minutes since midnight). */
export const EVENT_WINDOW = {
  startMinutes: 840, // 2:00 PM
  endMinutes: 1200, // 8:00 PM
};

/** Pilot area for this scenario - see shared/scenario.ts. */
export const PILOT_AREA = "Marathahalli";

/** Network requests give up after this long and fall back to mock data. */
export const FETCH_TIMEOUT_MS = 6000;
