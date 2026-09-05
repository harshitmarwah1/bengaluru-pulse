import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { PulseEvent, Recommendation } from "../types";
import { fetchEvents } from "../api";
import { supabase } from "../lib/supabase";
import { initAnalytics, setAnalyticsUser, track, OFFICER_EVENTS } from "../lib/analytics";
import { Header } from "./Header";
import { EventStrip } from "./EventStrip";
import { FlowRail } from "./FlowRail";
import { WhyPanel } from "./WhyPanel";
import { ImpactPanel } from "./ImpactPanel";
import { Recommendations } from "./Recommendations";
import { OutcomePanel } from "./OutcomePanel";

interface Props {
  session: Session;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onSignOut: () => void;
}

/**
 * The authenticated console shell: fetches the active risk event, subscribes
 * to Supabase Realtime for live approvals/predictions (no polling), and
 * instruments the officer analytics taxonomy (shared/analytics-events.ts).
 */
export function Console({ session, theme, onToggleTheme, onSignOut }: Props) {
  const [event, setEvent] = useState<PulseEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const viewedEventId = useRef<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      // v2 /api/events returns one PulseEvent per active corridor; the console
      // is a single-corridor pilot view, so it shows the first (per
      // API_CONTRACT.md, corridor can be filtered explicitly once the console
      // grows a corridor picker).
      const [data] = await fetchEvents();
      setEvent(data ?? null);
      setError(data ? null : "No active risk event for this corridor.");
    } catch (err) {
      console.error("Failed to load event", err);
      setError(err instanceof Error ? err.message : "Failed to load event");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    initAnalytics();
    setAnalyticsUser(session.user.id);
    track(OFFICER_EVENTS.consoleOpened);
    load();
  }, [load, session.user.id]);

  // Live updates via Supabase Realtime - no polling. Any change to the
  // predicted event or its recommendations triggers a refetch through the
  // authenticated API (keeps the server as the single source of truth for
  // joins/derived fields rather than reconstructing them client-side).
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const channel = client
      .channel("console-events")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "recommendations" }, () => load())
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [load]);

  useEffect(() => {
    if (!event || viewedEventId.current === event.id) return;
    viewedEventId.current = event.id;
    track(OFFICER_EVENTS.eventViewed, { event_id: event.id, corridor: event.corridor, state: event.state });
    track(OFFICER_EVENTS.whyMapOpened, { event_id: event.id });
    track(OFFICER_EVENTS.impactViewed, { event_id: event.id });
    track(OFFICER_EVENTS.outcomeViewed, { event_id: event.id });
  }, [event]);

  function handleRecommendationUpdated(updated: Recommendation) {
    setEvent((prev) =>
      prev
        ? {
            ...prev,
            recommendations: prev.recommendations.map((r) => (r.id === updated.id ? updated : r)),
          }
        : prev
    );
    track(OFFICER_EVENTS.recommendationApproved, {
      agency: updated.owner,
      rec_id: updated.id,
      triggers_push: Boolean(updated.triggersCitizenPush),
    });
    if (updated.triggersCitizenPush) {
      const reach = updated.statusMeta?.match(/([\d,]+)\s*reached/)?.[1];
      track(OFFICER_EVENTS.advisorySent, { reach: reach ? Number(reach.replace(/,/g, "")) : undefined });
    }
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
        <Header theme={theme} onToggleTheme={onToggleTheme} officerEmail={session.user.email} onSignOut={onSignOut} />
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
