// Thin fetch client for the Bengaluru Pulse server. The console is a pure
// client of the API described in API_CONTRACT.md - no local state beyond
// what's needed to reflect optimistic/refetched server responses.
import { API_BASE } from "./config";
import type { PulseEvent, Recommendation, PushMessage } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (body?.error) detail = body.error;
    } catch {
      // ignore - keep statusText
    }
    throw new Error(`${res.status} ${detail}`);
  }
  return res.json() as Promise<T>;
}

export function fetchEvent(): Promise<PulseEvent> {
  return request<PulseEvent>("/api/event");
}

export function approveRecommendation(id: string): Promise<Recommendation> {
  return request<Recommendation>(`/api/recommendations/${encodeURIComponent(id)}/approve`, {
    method: "POST",
  });
}

export interface AdvisorySendResponse {
  ok: true;
  sent: number;
  message: PushMessage;
}

export function sendAdvisory(at?: number): Promise<AdvisorySendResponse> {
  return request<AdvisorySendResponse>("/api/advisory/send", {
    method: "POST",
    body: JSON.stringify(at !== undefined ? { at } : {}),
  });
}
