// GET /api/health - no auth, no DB dependency. Must respond even when
// Supabase env vars are missing, so CI/local can smoke the server.

import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/health", async () => ({ ok: true }));

  // TEMP DIAGNOSTIC (revert after deploy bring-up): reports which Supabase
  // project the server is configured against. The URL/project-ref is not a
  // secret; the service-role key is never exposed.
  app.get("/api/_diag", async () => ({
    supabaseUrl: process.env.SUPABASE_URL ?? null,
    serviceKeySet: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    serviceKeyLen: (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").length,
  }));
}
