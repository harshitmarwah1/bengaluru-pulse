// Bengaluru Pulse - officer auth middleware.
// Console calls send `Authorization: Bearer <supabase access token>`. We
// verify it against Supabase Auth, then load the matching officers row -
// every write endpoint requires both (API_CONTRACT.md "Authentication").

import type { FastifyReply, FastifyRequest } from "fastify";
import { getSupabase } from "../db/client";
import { DEV_UNAUTHED, DEV_OFFICER } from "../dev/mode";

export interface Officer {
  id: string;
  name: string;
  agency: string;
  role: "officer" | "admin";
}

declare module "fastify" {
  interface FastifyRequest {
    officer?: Officer;
  }
}

function extractBearerToken(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1];
}

/**
 * Fastify preHandler for write endpoints. Verifies the bearer token with
 * Supabase Auth (a remote call - no local JWT secret to manage) and loads the
 * caller's officers row. Populates `req.officer` on success; otherwise sends
 * 401/403 and short-circuits the route. Throws SupabaseNotConfiguredError
 * (caught by index.ts's error handler -> 503) when Supabase isn't set up.
 */
export async function requireOfficer(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  // DEV-ONLY: skip Supabase token verification and act as a stub officer.
  if (DEV_UNAUTHED) {
    req.officer = DEV_OFFICER;
    return;
  }

  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    await reply.status(401).send({ ok: false, error: "missing Authorization: Bearer <token>" });
    return;
  }

  const supabase = getSupabase();

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    await reply.status(401).send({ ok: false, error: "invalid or expired token" });
    return;
  }

  const { data: officerRow, error: officerError } = await supabase
    .from("officers")
    .select("id, name, agency, role")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (officerError) throw officerError;

  if (!officerRow) {
    await reply.status(403).send({ ok: false, error: "no officer profile for this account" });
    return;
  }

  req.officer = officerRow as Officer;
}
