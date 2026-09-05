// Bengaluru Pulse - Supabase client (server-only, service-role key).
// The service-role key bypasses RLS - this client is never exposed to console
// or mobile, which only ever talk to this server over the API_CONTRACT.
//
// Graceful boot: when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are missing, we
// do NOT crash. GET /api/health must still respond so CI/local can smoke the
// server. Every other route that needs the database throws
// SupabaseNotConfiguredError, which index.ts's error handler turns into a 503.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super("Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)");
    this.name = "SupabaseNotConfiguredError";
  }
}

let client: SupabaseClient | null = null;

if (supabaseConfigured) {
  client = createClient(SUPABASE_URL as string, SUPABASE_SERVICE_ROLE_KEY as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
} else {
  // eslint-disable-next-line no-console
  console.warn(
    "[db] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set - starting without a database. " +
      "GET /api/health will still respond; all other endpoints return 503 until configured."
  );
}

/** Returns the service-role client, or throws SupabaseNotConfiguredError. */
export function getSupabase(): SupabaseClient {
  if (!client) {
    throw new SupabaseNotConfiguredError();
  }
  return client;
}
