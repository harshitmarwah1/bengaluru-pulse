import type { PulseEvent } from "../types";

const STATE_LABEL: Record<PulseEvent["state"], string> = {
  normal: "Normal",
  delay: "Delay Risk",
  disruption: "Disruption",
};

export function EventStrip({ event }: { event: PulseEvent }) {
  return (
    <div className={`event-strip st-${event.state}`}>
      <div>
        <div className="eid mono">
          <span className="live">
            <span className="d" />
            LIVE
          </span>
          · EVENT #{event.id} · lead time {event.leadTimeMin} min
        </div>
        <div className="etitle">
          {event.corridor} · impact window {event.windowLabel}
        </div>
      </div>
      <span className={`state-tag ${event.state}`}>
        <span className="d" />
        {STATE_LABEL[event.state]}
        {event.state !== "normal" ? " ↑" : ""}
      </span>
    </div>
  );
}
