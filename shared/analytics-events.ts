// Bengaluru Pulse - Amplitude event taxonomy (Wave 0 foundation).
// Shared by console (Browser SDK) and mobile (React Native SDK) so event names
// never drift between the two clients. Behavioral analytics only - domain KPIs
// (person-minutes avoided, prediction accuracy) live in Supabase, not Amplitude.

export const OFFICER_EVENTS = {
  consoleOpened: "console_opened",
  eventViewed: "event_viewed",
  whyMapOpened: "why_map_opened",
  impactViewed: "impact_viewed",
  recommendationApproved: "recommendation_approved", // props: agency, rec_id, triggers_push
  advisorySent: "advisory_sent", // props: reach
  outcomeViewed: "outcome_viewed",
} as const;

export const CITIZEN_EVENTS = {
  appOpened: "app_opened",
  pushReceived: "push_received",
  pushOpened: "push_opened",
  pulseViewed: "pulse_viewed", // props: state
  advisoryViewed: "advisory_viewed",
  actionTapped: "action_tapped", // props: kind ("time" | "metro")
  timelineScrubbed: "timeline_scrubbed",
} as const;

export type OfficerEvent = (typeof OFFICER_EVENTS)[keyof typeof OFFICER_EVENTS];
export type CitizenEvent = (typeof CITIZEN_EVENTS)[keyof typeof CITIZEN_EVENTS];
