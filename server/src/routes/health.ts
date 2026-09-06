// GET /api/health - no auth, no DB dependency. Must respond even when
// Supabase env vars are missing, so CI/local can smoke the server.

import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/health", async () => ({ ok: true }));
}
