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

/** A non-empty env value that is still an unresolved placeholder, e.g. "<PASTE ...>". */
function isPlaceholder(value: string): boolean {
  return value.includes("<") || value.includes("PASTE");
}

function isValidHttpUrl(value: string | undefined): value is string {
  if (!value || isPlaceholder(value)) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function makeClient(): SupabaseClient | undefined {
  // Require a valid URL + a real (non-placeholder) anon key. A half-filled or
  // malformed .env must degrade to the disabled-login shell, never crash the
  // whole console with an unguarded createClient() throw (blank screen).
  if (!isValidHttpUrl(url) || !anonKey || isPlaceholder(anonKey)) return undefined;
  try {
    return createClient(url, anonKey);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[supabase] createClient failed - rendering disabled-login shell:", err);
    return undefined;
  }
}

export const supabase: SupabaseClient | undefined = makeClient();
export const supabaseConfigured = supabase !== undefined;
