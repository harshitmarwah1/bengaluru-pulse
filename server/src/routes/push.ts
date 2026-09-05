// POST /api/push/register - mobile registers its Expo push token. No auth.

import type { FastifyInstance } from "fastify";
import { upsertPushToken } from "../db/push-tokens";

export async function pushRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { expoPushToken?: string; area?: string } }>(
    "/api/push/register",
    async (req, reply) => {
      const { expoPushToken, area } = req.body ?? {};
      if (!expoPushToken || typeof expoPushToken !== "string") {
        return reply.status(400).send({ ok: false, error: "expoPushToken is required" });
      }
      const registered = await upsertPushToken(expoPushToken, area);
      return { ok: true, registered };
    }
  );
}
