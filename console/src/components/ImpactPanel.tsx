import type { ContributingFactor, Impact } from "../types";

const FACTOR_GLYPH: Record<ContributingFactor["kind"], string> = {
  rain: "☂",
  flood: "◈",
  traffic: "▲",
  event: "●",
};

function formatPeople(n: number): { v: string; suffix?: string } {
  if (n >= 1000) return { v: `~${Math.round(n / 1000)}`, suffix: "k" };
  return { v: String(n) };
}

interface Props {
  impact: Impact;
  confidencePct: number;
  uncertaintyMin: number;
  factors: ContributingFactor[];
}

export function ImpactPanel({ impact, confidencePct, uncertaintyMin, factors }: Props) {
  const people = formatPeople(impact.peopleAffected);
  // Scale the uncertainty meter against the top of the predicted delay
  // range, so ±15m against a 25-40min prediction reads as a meaningful bar.
  const uncertaintyPct = Math.min(100, Math.round((uncertaintyMin / impact.addedTravelMin[1]) * 100));

  return (
    <div className="cell">
      <h3>Impact &amp; confidence</h3>
      <div className="impact">
        <div className="kpi">
          <div className="k">Added travel time</div>
          <div className="v">
            +{impact.addedTravelMin[0]}–{impact.addedTravelMin[1]}
            <small> min</small>
          </div>
        </div>
        <div className="kpi">
          <div className="k">People affected</div>
          <div className="v">
            {people.v}
            {people.suffix && <small>{people.suffix}</small>}
          </div>
        </div>
        <div className="kpi">
          <div className="k">Bus routes exposed</div>
          <div className="v">
            {impact.busRoutesExposed}
            <small> BMTC</small>
          </div>
        </div>
        <div className="kpi">
          <div className="k">Junctions in spread</div>
          <div className="v">{impact.junctionsInSpread}</div>
        </div>
      </div>

      <div className="conf-row">
        <div className="conf-card">
          <div className="lab mono">
            <span>Confidence</span>
          </div>
          <div className="val" style={{ color: "var(--indigo)" }}>
            {confidencePct}%
          </div>
          <div className="meter">
            <i style={{ width: `${confidencePct}%`, background: "var(--indigo)" }} />
          </div>
        </div>
        <div className="conf-card">
          <div className="lab mono">
            <span>Uncertainty</span>
          </div>
          <div className="val" style={{ color: "var(--warn)" }}>
            ±{uncertaintyMin}m
          </div>
          <div className="meter">
            <i style={{ width: `${uncertaintyPct}%`, background: "var(--warn)" }} />
          </div>
        </div>
      </div>

      <ul className="factors">
        {factors.map((f) => (
          <li key={f.label}>
            <span className="fi">{FACTOR_GLYPH[f.kind]}</span>
            <span>
              <b>{f.label}</b> <span className="d">{f.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
