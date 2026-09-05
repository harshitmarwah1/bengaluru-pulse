// POST /api/advisory/send - fans out the current citizen advisory via Expo
// push. `sendAdvisoryForCorridor` is also reused by routes/recommendations.ts
// when approving the DULT advisory recommendation (API_CONTRACT.md).

import type { FastifyInstance } from "fastify";
import type { PushMessage, RiskState } from "../../../shared/types";
import { toCitizenPulse } from "../../../shared/scenario";
import { requireOfficer } from "../auth/officer";
import { getLatestEventForCorridor, updateRecommendationStatus } from "../db/events";
import { insertAdvisory } from "../db/advisories";
import { writeAuditLog } from "../db/audit";
import { formatClock, formatReachedCount } from "../db/format";
import { sendPushToAll } from "../push/expo";
import { DEFAULT_CORRIDOR_ID } from "./pulse";

export interface AdvisoryResult {
  ok: true;
  sent: number;
  message: PushMessage;
}

/** Returns null when the corridor has no active event to advise on. */
export async function sendAdvisoryForCorridor(
  corridorId: string,
  atMinutes: number | undefined,
  actorId: string
): Promise<AdvisoryResult | null> {
  const event = await getLatestEventForCorridor(corridorId);
  if (!event) return null;

  const pulse = toCitizenPulse(event, atMinutes);
  const message: PushMessage = {
    title: `Bengaluru Pulse: ${pulse.headline}`,
    body: pulse.advisory,
    data: { eventId: pulse.eventId, state: pulse.state as RiskState },
  };

  const sent = await sendPushToAll(message);

  await insertAdvisory({
    eventId: event.id,
    title: message.title,
    body: message.body,
    reachedCount: sent,
  });

  const advisoryRec = event.recommendations.find(
    (r) => r.triggersCitizenPush || r.id === "rec-dult-advisory"
  );
  if (advisoryRec) {
    const time = formatClock(new Date());
    const statusMeta =
      sent > 0
        ? `Sent ${time} - ${formatReachedCount(sent)} reached`
        : `Sent ${time} - simulated, no device registered`;
    await updateRecommendationStatus(advisoryRec.id, "sent", statusMeta);
  }

  await writeAuditLog({
    actorId,
    action: "send_advisory",
    entity: "event",
    entityId: event.id,
    meta: { corridorId, sent },
  });

  return { ok: true, sent, message };
}

export async function advisoryRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { at?: number; corridor?: string } }>(
    "/api/advisory/send",
    { preHandler: requireOfficer },
    async (req, reply) => {
      const officer = req.officer;
      if (!officer) {
        return reply.status(500).send({ ok: false, error: "officer missing after auth" });
      }

      const corridorId = req.body?.corridor ?? DEFAULT_CORRIDOR_ID;
      const result = await sendAdvisoryForCorridor(corridorId, req.body?.at, officer.id);
      if (!result) {
        return reply
          .status(404)
          .send({ ok: false, error: `no active event for corridor '${corridorId}'` });
      }
      return result;
    }
  );
}
