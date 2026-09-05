// Thin fetch client for the Bengaluru Pulse server. The console is a pure
// client of the API described in API_CONTRACT.md (v2) - no local state beyond
// what's needed to reflect optimistic/refetched server responses.
//
// Every call attaches the signed-in officer's Supabase access token as
// `Authorization: Bearer <token>` - all v2 console endpoints require it. When
// Supabase isn't configured (no local session possible) the header is simply
// omitted; the server will reject with 401, surfaced like any other API error.
import { API_BASE } from "./config";
import { supabase } from "./lib/supabase";
import type { PulseEvent, Recommendation, PushMessage } from "./types";

async function authHeaders(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const auth = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...auth, ...init?.headers },
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

/** GET /api/events?corridor=<id> - one PulseEvent per active corridor. */
export function fetchEvents(corridor?: string): Promise<PulseEvent[]> {
  const qs = corridor ? `?corridor=${encodeURIComponent(corridor)}` : "";
  return request<PulseEvent[]>(`/api/events${qs}`);
}

/** GET /api/events/:id - full PulseEvent (recs, timeline, outcome joined). */
export function fetchEventById(id: string): Promise<PulseEvent> {
  return request<PulseEvent>(`/api/events/${encodeURIComponent(id)}`);
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

export function sendAdvisory(at?: number, corridor?: string): Promise<AdvisorySendResponse> {
  const body: { at?: number; corridor?: string } = {};
  if (at !== undefined) body.at = at;
  if (corridor !== undefined) body.corridor = corridor;
  return request<AdvisorySendResponse>("/api/advisory/send", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
