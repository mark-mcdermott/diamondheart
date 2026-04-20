const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return "just now";

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 45) return "just now";
  if (diffSec < HOUR) return `${Math.max(1, Math.round(diffSec / MINUTE))}m ago`;
  if (diffSec < DAY) return `${Math.round(diffSec / HOUR)}h ago`;
  if (diffSec < WEEK) return `${Math.round(diffSec / DAY)}d ago`;

  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0 min";
  if (seconds < 60) return `${seconds}s`;

  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;

  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins === 0 ? `${hours} hr` : `${hours} hr ${remMins} min`;
}
