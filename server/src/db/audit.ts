// Bengaluru Pulse - audit_log data access.
// "recommend-and-account requires a trail" (0001_init.sql) - every officer
// write (approve, advisory send) is recorded here.

import { getSupabase } from "./client";

export interface AuditEntry {
  actorId: string;
  action: string; // 'approve_recommendation' | 'send_advisory'
  entity: string; // 'recommendation' | 'event'
  entityId: string;
  meta?: Record<string, unknown>;
}

/**
 * Best-effort audit write. By the time this runs, the officer's primary write
 * (approve, advisory send) has already succeeded - PostgREST has no
 * multi-statement transaction here, so there is no cheap way to roll that
 * back if the audit insert fails. Log loudly instead of failing the request,
 * so a transient audit-log outage never blocks an officer from acting.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("audit_log").insert({
    actor_id: entry.actorId,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId,
    meta: entry.meta ?? {},
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[audit] failed to write audit_log row:", error);
  }
}
