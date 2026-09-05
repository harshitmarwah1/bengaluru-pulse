// Bengaluru Pulse - push_tokens data access.
// Registration is anonymous (mobile, no auth) and deduped by token.

import { getSupabase } from "./client";

export async function upsertPushToken(expoPushToken: string, area?: string): Promise<number> {
  const supabase = getSupabase();

  // Only include `area` in the payload when provided, so a re-registration
  // without an area (e.g. a silent token refresh) does not clobber the area
  // captured on a previous registration - PostgREST's upsert only overwrites
  // columns present in the request body.
  const payload: { expo_push_token: string; area?: string } = { expo_push_token: expoPushToken };
  if (area) payload.area = area;

  const { error } = await supabase
    .from("push_tokens")
    .upsert(payload, { onConflict: "expo_push_token" });
  if (error) throw error;

  const { count, error: countError } = await supabase
    .from("push_tokens")
    .select("*", { count: "exact", head: true });
  if (countError) throw countError;
  return count ?? 0;
}

export async function listPushTokens(): Promise<string[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("push_tokens").select("expo_push_token");
  if (error) throw error;
  return (data ?? []).map((r: { expo_push_token: string }) => r.expo_push_token);
}
