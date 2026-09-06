// GET /api/health - no auth, no DB dependency. Must respond even when
// Supabase env vars are missing, so CI/local can smoke the server.

import type { FastifyInstance } from "fastify";
import { getSupabase, supabaseConfigured } from "../db/client";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/health", async () => ({ ok: true }));

  // TEMP DIAGNOSTIC (revert after deploy bring-up): reports the configured
  // Supabase project and probes which of our tables its API can see. The
  // URL/project-ref is not a secret; the service-role key is never exposed.
  app.get("/api/_diag", async () => {
    const out: Record<string, unknown> = {
      supabaseUrl: process.env.SUPABASE_URL ?? null,
      serviceKeySet: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      serviceKeyLen: (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").length,
    };
    if (supabaseConfigured) {
      const supabase = getSupabase();
      for (const table of ["agencies", "corridors", "events"]) {
        const { data, error } = await supabase.from(table).select("*", { count: "exact", head: true });
        out[table] = error ? { error: error.message, code: error.code } : { ok: true, rows: (data as unknown) ?? "head" };
      }
    }
    return out;
  });
}
