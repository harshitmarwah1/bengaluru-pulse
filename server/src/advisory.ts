// Shared advisory-send path used by both POST /api/advisory/send and
// approving the rec-dult-advisory recommendation (per API_CONTRACT.md).

import type { PushMessage, RiskState } from "../../shared/types";
import { toCitizenPulse } from "../../shared/scenario";
import { event, findRecommendation } from "./state";
import { sendPushToAll } from "./push";

function formatNowClock(): string {
  const d = new Date();
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatReached(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

export interface AdvisoryResult {
  ok: true;
  sent: number;
  message: PushMessage;
}

export async function sendAdvisory(atMinutes?: number): Promise<AdvisoryResult> {
  const pulse = toCitizenPulse(event, atMinutes);

  const message: PushMessage = {
    title: `Bengaluru Pulse: ${pulse.headline}`,
    body: pulse.advisory,
    data: { eventId: pulse.eventId, state: pulse.state as RiskState },
  };

  const sent = await sendPushToAll(message);

  const rec = findRecommendation("rec-dult-advisory");
  if (rec) {
    rec.status = "sent";
    const time = formatNowClock();
    rec.statusMeta =
      sent > 0
        ? `Sent ${time} - ${formatReached(sent)} reached`
        : `Sent ${time} - simulated, no device registered`;
  }

  return { ok: true, sent, message };
}
