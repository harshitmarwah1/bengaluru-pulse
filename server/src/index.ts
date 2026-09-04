// Bengaluru Pulse - API server.
// Implements API_CONTRACT.md exactly. In-memory only, no database.
// Serves the canonical shared/scenario.ts data; console + mobile are pure clients.

import Fastify from "fastify";
import cors from "@fastify/cors";

import { event, findRecommendation, registerPushToken, tokenCount } from "./state";
import { toCitizenPulse } from "../../shared/scenario";
import { sendAdvisory } from "./advisory";

const PORT = Number(process.env.PORT ?? 4000);

const app = Fastify({ logger: true });

async function main() {
  await app.register(cors, {
    origin: ["http://localhost:5173", /\.exp\.direct$/, /^exp:\/\//, "*"],
  });

  // GET /api/health
  app.get("/api/health", async () => ({ ok: true }));

  // GET /api/event - full risk event for the agency console.
  app.get("/api/event", async () => event);

  // GET /api/pulse?at=<clockMinutes> - citizen subset for the mobile app.
  app.get<{ Querystring: { at?: string } }>("/api/pulse", async (req, reply) => {
    const { at } = req.query;
    let atMinutes: number | undefined;
    if (at !== undefined) {
      const parsed = Number(at);
      if (Number.isNaN(parsed)) {
        return reply.status(400).send({ ok: false, error: "invalid 'at' query param" });
      }
      atMinutes = parsed;
    }
    return toCitizenPulse(event, atMinutes);
  });

  // POST /api/push/register - mobile registers its Expo push token.
  app.post<{ Body: { expoPushToken?: string; area?: string } }>(
    "/api/push/register",
    async (req, reply) => {
      const { expoPushToken, area } = req.body ?? {};
      if (!expoPushToken || typeof expoPushToken !== "string") {
        return reply.status(400).send({ ok: false, error: "expoPushToken is required" });
      }
      registerPushToken(expoPushToken, area);
      return { ok: true, registered: tokenCount() };
    }
  );

  // POST /api/advisory/send - fan out the current citizen advisory via Expo push.
  app.post<{ Body: { at?: number } }>("/api/advisory/send", async (req) => {
    const at = req.body?.at;
    return sendAdvisory(typeof at === "number" ? at : undefined);
  });

  // POST /api/recommendations/:id/approve - approve/assign a recommendation.
  app.post<{ Params: { id: string } }>(
    "/api/recommendations/:id/approve",
    async (req, reply) => {
      const rec = findRecommendation(req.params.id);
      if (!rec) {
        return reply.status(404).send({ ok: false, error: `no recommendation '${req.params.id}'` });
      }

      if (rec.triggersCitizenPush || rec.id === "rec-dult-advisory") {
        await sendAdvisory();
        return rec;
      }

      rec.status = "awaiting";
      rec.statusMeta = `Assigned - awaiting ${rec.owner}`;
      return rec;
    }
  );

  await app.listen({ port: PORT, host: "0.0.0.0" });
  app.log.info(`Bengaluru Pulse server listening on http://localhost:${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
