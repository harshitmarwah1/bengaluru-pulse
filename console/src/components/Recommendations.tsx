import { useState } from "react";
import type { Recommendation } from "../types";
import { approveRecommendation } from "../api";
import { CheckIcon, ClockIcon } from "./Icons";

interface Props {
  recommendations: Recommendation[];
  onUpdated: (rec: Recommendation) => void;
}

function StatusPill({ rec }: { rec: Recommendation }) {
  switch (rec.status) {
    case "acknowledged":
      return (
        <span className="status ack mono">
          <CheckIcon className="ic" />
          {rec.statusMeta ?? "Acknowledged"}
        </span>
      );
    case "sent":
    case "acted":
      return (
        <span className="status done mono">
          <CheckIcon className="ic" />
          {rec.statusMeta ?? (rec.status === "sent" ? "Sent" : "Acted")}
        </span>
      );
    case "awaiting":
    default:
      return (
        <span className="status wait mono">
          <ClockIcon className="ic" />
          {rec.statusMeta ?? "Awaiting response"}
        </span>
      );
  }
}

export function Recommendations({ recommendations, onUpdated }: Props) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  async function handleApprove(id: string) {
    setPendingId(id);
    setErrorId(null);
    try {
      const updated = await approveRecommendation(id);
      onUpdated(updated);
    } catch (err) {
      console.error("Failed to approve recommendation", id, err);
      setErrorId(id);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="recs">
      <h3>Recommendations — owner &amp; status</h3>
      {recommendations
        .slice()
        .sort((a, b) => a.priority - b.priority)
        .map((rec) => (
          <div className="rec" key={rec.id}>
            <div className="owner">
              <span className="tag mono">{rec.owner}</span>
            </div>
            <div className="info">
              <div className="t">{rec.title}</div>
              <div className="s mono">{rec.detail}</div>
              {errorId === rec.id && (
                <div className="s mono" style={{ color: "var(--crit)" }}>
                  Approve failed — try again
                </div>
              )}
            </div>
            <div className="act">
              {rec.status === "pending" ? (
                <button
                  type="button"
                  className="btn"
                  disabled={pendingId === rec.id}
                  onClick={() => handleApprove(rec.id)}
                >
                  {pendingId === rec.id ? "Assigning…" : "Approve & assign"}
                </button>
              ) : (
                <StatusPill rec={rec} />
              )}
            </div>
          </div>
        ))}
    </div>
  );
}
