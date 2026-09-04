import { useCallback, useEffect, useState } from "react";
import type { PulseEvent, Recommendation } from "./types";
import { fetchEvent } from "./api";
import { useTheme } from "./hooks/useTheme";
import { Header } from "./components/Header";
import { EventStrip } from "./components/EventStrip";
import { FlowRail } from "./components/FlowRail";
import { WhyPanel } from "./components/WhyPanel";
import { ImpactPanel } from "./components/ImpactPanel";
import { Recommendations } from "./components/Recommendations";
import { OutcomePanel } from "./components/OutcomePanel";

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [event, setEvent] = useState<PulseEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetchEvent();
      setEvent(data);
      setError(null);
    } catch (err) {
      console.error("Failed to load event", err);
      setError(err instanceof Error ? err.message : "Failed to load event");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleRecommendationUpdated(updated: Recommendation) {
    setEvent((prev) =>
      prev
        ? {
            ...prev,
            recommendations: prev.recommendations.map((r) => (r.id === updated.id ? updated : r)),
          }
        : prev
    );
  }

  if (!event && !error) {
    return <div className="app-status mono">Loading Bengaluru Pulse console…</div>;
  }

  if (!event) {
    return (
      <div className="app-status mono">
        Couldn't reach the Bengaluru Pulse server at the configured API base.
        <div>{error}</div>
        <button type="button" className="btn retry" onClick={load}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="brandline" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <span className="eyebrow">Bengaluru Pulse · Civic Authority · agency console</span>
      </div>

      <div className="console">
        <Header theme={theme} onToggleTheme={toggleTheme} />
        <EventStrip event={event} />
        <FlowRail />

        <div className="c-grid">
          <WhyPanel floodContext={event.floodContext} />
          <ImpactPanel
            impact={event.impact}
            confidencePct={event.confidencePct}
            uncertaintyMin={event.uncertaintyMin}
            factors={event.factors}
          />
        </div>

        <Recommendations recommendations={event.recommendations} onUpdated={handleRecommendationUpdated} />

        <OutcomePanel outcome={event.outcome} onRefresh={load} refreshing={refreshing} />
      </div>

      <div className="foot mono">
        <span>Bengaluru Pulse · agency console · Civic Authority direction</span>
        <span>Illustrative data · updated {event.updatedAt}</span>
      </div>
    </div>
  );
}
