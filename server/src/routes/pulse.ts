// GET /api/pulse?corridor=&at= - citizen subset for the mobile app. No auth.

import type { FastifyInstance } from "fastify";
import { getLatestEventForCorridor } from "../db/events";
import { toCitizenPulse } from "../../../shared/scenario";

// API_CONTRACT.md: "Defaults to the pilot corridor (orr-east) if corridor
// omitted." Reused by routes/advisory.ts for the same default.
export const DEFAULT_CORRIDOR_ID = "orr-east";

export async function pulseRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { corridor?: string; at?: string } }>(
    "/api/pulse",
    async (req, reply) => {
      const corridorId = req.query.corridor ?? DEFAULT_CORRIDOR_ID;

      let atMinutes: number | undefined;
      if (req.query.at !== undefined) {
        const parsed = Number(req.query.at);
        if (Number.isNaN(parsed)) {
          return reply.status(400).send({ ok: false, error: "invalid 'at' query param" });
        }
        atMinutes = parsed;
      }

      const event = await getLatestEventForCorridor(corridorId);
      if (!event) {
        return reply
          .status(404)
          .send({ ok: false, error: `no active event for corridor '${corridorId}'` });
      }

      return toCitizenPulse(event, atMinutes);
    }
  );
}
