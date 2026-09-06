// Bengaluru Pulse - advisories data access (the citizen-push dispatch log).

import { getSupabase } from "./client";
import { DEV_UNAUTHED } from "../dev/mode";

export interface InsertAdvisoryParams {
  eventId: string;
  title: string;
  body: string;
  reachedCount: number;
}

export async function insertAdvisory(params: InsertAdvisoryParams): Promise<void> {
  if (DEV_UNAUTHED) return; // no advisories table in dev-unauthed mode
  const supabase = getSupabase();
  const { error } = await supabase.from("advisories").insert({
    event_id: params.eventId,
    channel: "push",
    title: params.title,
    body: params.body,
    reached_count: params.reachedCount,
  });
  if (error) throw error;
}
