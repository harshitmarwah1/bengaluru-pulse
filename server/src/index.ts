// Bengaluru Pulse - API server.
// Implements API_CONTRACT.md v2. Supabase-backed (service-role key); console
// and mobile are pure clients - they never touch the DB for writes.

import Fastify from "fastify";
import cors from "@fastify/cors";

import { getSupabase, supabaseConfigured, SupabaseNotConfiguredError } from "./db/client";
import { healthRoutes } from "./routes/health";
import { eventsRoutes } from "./routes/events";
import { pulseRoutes } from "./routes/pulse";
import { pushRoutes } from "./routes/push";
import { advisoryRoutes } from "./routes/advisory";
import { recommendationsRoutes } from "./routes/recommendations";
import { startPipeline } from "./pipeline";

const PORT = Number(process.env.PORT ?? 4000);

const app = Fastify({ logger: true });

async function main() {
  await app.register(cors, {
    origin: ["http://localhost:5173", /\.exp\.direct$/, /^exp:\/\//, "*"],
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof SupabaseNotConfiguredError) {
      req.log.warn(err.message);
      return reply.status(503).send({ ok: false, error: "Supabase is not configured on this server" });
    }
    req.log.error(err);
    return reply.status(500).send({ ok: false, error: "internal server error" });
  });

  await app.register(healthRoutes);
  await app.register(eventsRoutes);
  await app.register(pulseRoutes);
  await app.register(pushRoutes);
  await app.register(advisoryRoutes);
  await app.register(recommendationsRoutes);

  // TEMP BOOTSTRAP (guarded; remove after first officer is linked): links an
  // existing Supabase Auth user to an officers row using the service-role key
  // the server already holds. Only touches one specific test officer.
  app.post<{ Querystring: { token?: string; email?: string; agency?: string } }>(
    "/api/_seed_officer",
    async (req, reply) => {
      if (req.query.token !== "bootstrap-7Kq2xP") {
        return reply.status(403).send({ ok: false, error: "forbidden" });
      }
      if (!supabaseConfigured) {
        return reply.status(503).send({ ok: false, error: "supabase not configured" });
      }
      const email = req.query.email ?? "officer@dult.gov.in";
      const agency = req.query.agency ?? "DULT";
      const supabase = getSupabase();
      const { data: list, error: le } = await supabase.auth.admin.listUsers({ perPage: 200 });
      if (le) return reply.status(500).send({ ok: false, error: le.message });
      const user = list.users.find((u) => u.email === email);
      if (!user) return reply.status(404).send({ ok: false, error: "auth user not found", email });
      const { error: ie } = await supabase
        .from("officers")
        .upsert({ id: user.id, name: "Test Officer", agency, role: "admin" });
      if (ie) return reply.status(500).send({ ok: false, error: ie.message });
      return { ok: true, linked: user.id, email, agency };
    }
  );

  await app.listen({ port: PORT, host: "0.0.0.0" });
  app.log.info(`Bengaluru Pulse server listening on http://localhost:${PORT}`);

  // Seam: the feed/ingestion/prediction pipeline (owned by another Wave 1
  // agent) starts here, exactly once, after the server is already accepting
  // requests. Skipped gracefully when there is no database to write into.
  if (supabaseConfigured) {
    startPipeline(getSupabase());
  } else {
    app.log.warn("[pipeline] Supabase not configured - skipping feed/ingestion pipeline startup");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
