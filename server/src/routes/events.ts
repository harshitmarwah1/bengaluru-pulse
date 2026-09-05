// GET /api/events, GET /api/events/:id - officer-only.

import type { FastifyInstance } from "fastify";
import { requireOfficer } from "../auth/officer";
import { getEventById, listLatestEvents } from "../db/events";

export async function eventsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { corridor?: string } }>(
    "/api/events",
    { preHandler: requireOfficer },
    async (req) => {
      const events = await listLatestEvents(req.query.corridor);
      return events;
    }
  );

  app.get<{ Params: { id: string } }>(
    "/api/events/:id",
    { preHandler: requireOfficer },
    async (req, reply) => {
      const event = await getEventById(req.params.id);
      if (!event) {
        return reply.status(404).send({ ok: false, error: `no event '${req.params.id}'` });
      }
      return event;
    }
  );
}
