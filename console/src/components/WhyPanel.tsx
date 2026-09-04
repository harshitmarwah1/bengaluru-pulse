import type { FloodContext } from "../types";
import { FloodMap } from "./FloodMap";

export function WhyPanel({ floodContext }: { floodContext: FloodContext }) {
  return (
    <div className="cell bordered">
      <h3>
        <span className="why">◆</span> Why — flood-context layer
      </h3>
      <FloodMap floodContext={floodContext} />
      <div className="src mono">
        <span className="b">Source:</span> {floodContext.source}
      </div>
    </div>
  );
}
