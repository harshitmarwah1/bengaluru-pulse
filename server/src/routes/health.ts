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
      build: "no-embed-hydrate",
      supabaseUrl: process.env.SUPABASE_URL ?? null,
      serviceKeySet: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      serviceKeyLen: (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").length,
    };
    if (supabaseConfigured) {
      const supabase = getSupabase();
      for (const table of ["agencies", "corridors", "events"]) {
        const { error, count } = await supabase.from(table).select("*", { count: "exact", head: true });
        out[table] = error ? { error: error.message, code: error.code } : { ok: true, count };
      }
      // Real data SELECT on events (the path /api/pulse uses), not a HEAD probe.
      const ev = await supabase.from("events").select("id, corridor_id, state").limit(3);
      out.eventsSelect = ev.error
        ? { error: ev.error.message, code: ev.error.code }
        : { ok: true, rows: ev.data };

      // Ask PostgREST directly what tables it exposes (raw OpenAPI root).
      try {
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
        const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
        });
        const spec = (await res.json()) as { definitions?: Record<string, unknown>; paths?: Record<string, unknown> };
        out.postgrestRoot = {
          status: res.status,
          tables: spec.definitions ? Object.keys(spec.definitions) : Object.keys(spec.paths ?? {}).slice(0, 40),
        };
      } catch (e) {
        out.postgrestRoot = { error: (e as Error).message };
      }
    }
    return out;
  });
}
