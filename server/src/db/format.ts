// Bengaluru Pulse - small formatting helpers for the data-access layer.
// The DB stores real timestamptz values (events.updated_at) but shared/types.ts
// displays them as pre-formatted clock strings (e.g. "4:15 PM"), matching the
// other already-formatted text columns (timeline_snapshots.time_label,
// outcomes.flagged_at). This is the one place that bridges the two.

export function formatClock(date: Date): string {
  let h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function formatClockIso(iso: string): string {
  return formatClock(new Date(iso));
}

/** Formats a reached count the way the console/mobile copy expects, e.g. "38k". */
export function formatReachedCount(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}
