import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "../lib/supabase";

export interface SessionState {
  session: Session | null;
  /** true until the initial getSession() call resolves */
  loading: boolean;
  /** false when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are unset */
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

/**
 * Tracks the officer's Supabase Auth session and exposes sign-in/sign-out.
 * Gates the console behind login - see App.tsx. Guards every call for the
 * no-Supabase-configured case so the console still builds and renders its
 * shell (a disabled login screen) with no keys.
 */
export function useSession(): SessionState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      return { error: "Supabase auth is not configured in this environment." };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  return { session, loading, configured: supabaseConfigured, signIn, signOut };
}
