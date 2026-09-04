import { Fragment } from "react";

const STEPS = ["Risk", "Why", "Impact", "Intervention", "Owner", "Status"];

export function FlowRail() {
  return (
    <div className="flow">
      {STEPS.map((label, i) => (
        <Fragment key={label}>
          <span className="step active">
            <span className="n">{i + 1}</span>
            {label}
          </span>
          {i < STEPS.length - 1 && <span className="arr">→</span>}
        </Fragment>
      ))}
    </div>
  );
}
