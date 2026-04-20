import { Sun, CalendarRange, CalendarDays, Calendar, type LucideIcon } from "lucide-react";

export const VIEW_RANGES = [
  { value: "day", label: "Day", icon: Sun },
  { value: "week", label: "Week", icon: CalendarRange },
  { value: "month", label: "Month", icon: CalendarDays },
  { value: "year", label: "Year", icon: Calendar },
] as const satisfies readonly { value: string; label: string; icon: LucideIcon }[];

export type ViewRange = (typeof VIEW_RANGES)[number]["value"];

export const VIEW_RANGE_VALUES: readonly ViewRange[] = VIEW_RANGES.map((r) => r.value);

export function isViewRange(value: string | null | undefined): value is ViewRange {
  return !!value && (VIEW_RANGE_VALUES as readonly string[]).includes(value);
}

/**
 * Returns the inclusive start-of-range Date for a given view, anchored at `now`.
 * Day → start of today, Week → 7 days ago (midnight), Month → 30 days ago,
 * Year → 365 days ago.
 */
export function viewRangeStart(range: ViewRange, now: Date = new Date()): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  switch (range) {
    case "day":
      return start;
    case "week":
      start.setDate(start.getDate() - 6);
      return start;
    case "month":
      start.setDate(start.getDate() - 29);
      return start;
    case "year":
      start.setDate(start.getDate() - 364);
      return start;
  }
}

export function filterByViewRange<T extends { date: Date | string }>(
  items: T[],
  range: ViewRange,
  now: Date = new Date(),
): T[] {
  const cutoff = viewRangeStart(range, now);
  return items.filter((i) => {
    const d = typeof i.date === "string" ? new Date(i.date) : i.date;
    return d >= cutoff;
  });
}
