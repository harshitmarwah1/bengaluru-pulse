// Supabase client for officer auth + Realtime. Uses the public anon key only
// (RLS-guarded reads) - the console never writes to the DB directly, writes
// go through the API on the service-role key (see api.ts / API_CONTRACT.md).
//
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY may be unset in local/dev
// environments that have no live Supabase project yet. In that case
// `supabase` is undefined and every caller must guard for it, so the console
// still builds and renders its shell (a disabled login screen) with no keys.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | undefined = supabaseConfigured
  ? createClient(url as string, anonKey as string)
  : undefined;
