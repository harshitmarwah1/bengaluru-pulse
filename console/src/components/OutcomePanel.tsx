import type { Outcome } from "../types";
import { PlayIcon } from "./Icons";

interface Props {
  outcome: Outcome;
  onRefresh: () => void;
  refreshing: boolean;
}

export function OutcomePanel({ outcome, onRefresh, refreshing }: Props) {
  const markColor = outcome.withinPrediction ? "var(--ok)" : "var(--crit)";
  return (
    <div className="outcome">
      <div className="txt">
        <div className="h">Outcome — prediction vs reality</div>
        <div className="v">
          Flagged <b style={{ color: "var(--ink)" }}>{outcome.flaggedAt}</b> → actual peak delay{" "}
          <b>{outcome.actualPeakDelayMin} min</b> (predicted {outcome.predictedRange[0]}–
          {outcome.predictedRange[1]}){" "}
          <span style={{ color: markColor, fontWeight: 700 }}>{outcome.withinPrediction ? "✓" : "✗"}</span>
        </div>
        <div className="a mono">
          {outcome.baselineNote}
        </div>
        <button type="button" className="replay mono" onClick={onRefresh} disabled={refreshing}>
          <PlayIcon /> {refreshing ? "refreshing…" : "refresh event"}
        </button>
      </div>
      <div className="northstar">
        <div className="n">~{outcome.avoidedPersonMin.toLocaleString("en-IN")}</div>
        <div className="l">person-min delay avoided (estimate)</div>
      </div>
    </div>
  );
}
