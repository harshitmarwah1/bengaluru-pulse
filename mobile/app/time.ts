// Bengaluru Pulse (mobile) - small time-formatting helpers (no external date library needed).

/** Minutes-since-midnight -> "4:15 PM". Used by the timeline scrubber while dragging. */
export function formatClockMinutes(clockMinutes: number): string {
  const total = ((Math.round(clockMinutes) % 1440) + 1440) % 1440;
  const hours24 = Math.floor(total / 60);
  const minutes = total % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

/** The device's live wall-clock time, e.g. "Fri 5 Sep · 6:42 PM". Shown in the card header. */
export function formatNow(date: Date): string {
  const weekday = date.toLocaleDateString(undefined, { weekday: "short" });
  const day = date.getDate();
  const month = date.toLocaleDateString(undefined, { month: "short" });
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${weekday} ${day} ${month} · ${time}`;
}
