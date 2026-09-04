// Bengaluru Pulse (mobile) - API client.
//
// Pure client of the server API described in ../../API_CONTRACT.md. The real fetch is always
// attempted first; a local mock (app/mock.ts) is only a fallback for when the server is
// unreachable (isolated dev, or a phone that hasn't been pointed at the dev machine's LAN IP
// yet - see app/config.ts). Callers get a `source: "live" | "mock"` tag so the UI can make the
// fallback visible rather than silently pretending it's real data.

import { API_BASE, FETCH_TIMEOUT_MS } from "./config";
import { mockCitizenPulse } from "./mock";
import type { CitizenPulse, PushRegistration, PushRegistrationResponse } from "./types";

export class ApiError extends Error {}

async function fetchWithTimeout(input: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export interface PulseResult {
  data: CitizenPulse;
  source: "live" | "mock";
  error?: string;
}

/** GET /api/pulse?at=<clockMinutes> - the citizen card's data source. */
export async function fetchPulse(atClockMinutes?: number): Promise<PulseResult> {
  const url = new URL("/api/pulse", API_BASE);
  if (atClockMinutes != null) url.searchParams.set("at", String(atClockMinutes));

  try {
    const res = await fetchWithTimeout(url.toString());
    if (!res.ok) throw new ApiError(`GET /api/pulse -> HTTP ${res.status}`);
    const data = (await res.json()) as CitizenPulse;
    return { data, source: "live" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[Bengaluru Pulse] GET /api/pulse unreachable at ${API_BASE} (${message}) - using MOCK fallback. ` +
        "Set EXPO_PUBLIC_API_BASE or app.json extra.apiBase to your server's address."
    );
    return { data: mockCitizenPulse(atClockMinutes), source: "mock", error: message };
  }
}

/** POST /api/push/register - register this device's Expo push token with the server. */
export async function registerPush(
  registration: PushRegistration
): Promise<{ ok: boolean; source: "live" | "mock"; error?: string }> {
  const url = new URL("/api/push/register", API_BASE);
  try {
    const res = await fetchWithTimeout(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registration),
    });
    if (!res.ok) throw new ApiError(`POST /api/push/register -> HTTP ${res.status}`);
    const data = (await res.json()) as PushRegistrationResponse;
    return { ok: data.ok, source: "live" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[Bengaluru Pulse] POST /api/push/register unreachable at ${API_BASE} (${message}) - ` +
        "the token was generated locally but could not be handed to the server."
    );
    return { ok: false, source: "mock", error: message };
  }
}
