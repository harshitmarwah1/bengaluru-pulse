// POST /api/recommendations/:id/approve - officer-only.

import type { FastifyInstance } from "fastify";
import { requireOfficer } from "../auth/officer";
import { getRecommendationById, updateRecommendationStatus } from "../db/events";
import { writeAuditLog } from "../db/audit";
import { sendAdvisoryForCorridor } from "./advisory";

export async function recommendationsRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { id: string } }>(
    "/api/recommendations/:id/approve",
    { preHandler: requireOfficer },
    async (req, reply) => {
      const officer = req.officer;
      if (!officer) {
        return reply.status(500).send({ ok: false, error: "officer missing after auth" });
      }

      const lookup = await getRecommendationById(req.params.id);
      if (!lookup) {
        return reply
          .status(404)
          .send({ ok: false, error: `no recommendation '${req.params.id}'` });
      }
      const { recommendation, corridorId } = lookup;

      // triggers_citizen_push recs (the DULT advisory) run the advisory-send
      // path instead of the plain "awaiting <owner>" transition.
      if (recommendation.triggersCitizenPush) {
        const result = await sendAdvisoryForCorridor(corridorId, undefined, officer.id);
        if (!result) {
          return reply
            .status(404)
            .send({ ok: false, error: `no active event for corridor '${corridorId}'` });
        }

        await writeAuditLog({
          actorId: officer.id,
          action: "approve_recommendation",
          entity: "recommendation",
          entityId: req.params.id,
          meta: { triggeredAdvisory: true, sent: result.sent },
        });

        const updated = await getRecommendationById(req.params.id);
        return updated?.recommendation ?? recommendation;
      }

      const statusMeta = `Assigned - awaiting ${recommendation.owner}`;
      const updated = await updateRecommendationStatus(req.params.id, "awaiting", statusMeta);

      await writeAuditLog({
        actorId: officer.id,
        action: "approve_recommendation",
        entity: "recommendation",
        entityId: req.params.id,
        meta: { newStatus: "awaiting" },
      });

      return updated;
    }
  );
}
