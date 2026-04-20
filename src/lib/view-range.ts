import { CalendarClock, CalendarRange, CalendarDays, Calendar, type LucideIcon } from "lucide-react";

export const VIEW_RANGES = [
  { value: "day", label: "Day", icon: CalendarClock },
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
 * Half-open calendar range containing `anchor` (inclusive start, exclusive end).
 * Week → ISO week (Mon–Sun). Month → calendar month. Year → calendar year.
 * Day → just the anchor date.
 */
export interface ViewBounds {
  start: Date;
  end: Date;
}

export function viewRangeBounds(view: ViewRange, anchor: Date = new Date()): ViewBounds {
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);

  switch (view) {
    case "day":
      end.setDate(end.getDate() + 1);
      return { start, end };
    case "week": {
      // ISO week: Monday start
      const daysFromMon = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - daysFromMon);
      end.setTime(start.getTime());
      end.setDate(end.getDate() + 7);
      return { start, end };
    }
    case "month":
      start.setDate(1);
      end.setTime(start.getTime());
      end.setMonth(end.getMonth() + 1);
      return { start, end };
    case "year":
      start.setMonth(0, 1);
      end.setTime(start.getTime());
      end.setFullYear(end.getFullYear() + 1);
      return { start, end };
  }
}

/**
 * Human label for a view/anchor pair. When `anchor` is null, returns the "live"
 * label ("Today" / "This week" / …). Otherwise returns a specific range string.
 */
export function viewRangeLabel(view: ViewRange, anchor: Date | null): string {
  if (anchor === null) {
    switch (view) {
      case "day": return "Today";
      case "week": return "This week";
      case "month": return "This month";
      case "year": return "This year";
    }
  }
  const { start, end } = viewRangeBounds(view, anchor);
  const lastDay = new Date(end.getTime() - 1);
  switch (view) {
    case "day":
      return anchor.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    case "week": {
      const sameMonth = start.getMonth() === lastDay.getMonth();
      const s = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const e = sameMonth
        ? lastDay.toLocaleDateString("en-US", { day: "numeric" })
        : lastDay.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return `${s} – ${e}`;
    }
    case "month":
      return start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    case "year":
      return String(start.getFullYear());
  }
}

/** Move the anchor by one view-width in `direction` (+1 next, -1 prev). */
export function shiftAnchor(view: ViewRange, anchor: Date, direction: 1 | -1): Date {
  const next = new Date(anchor);
  switch (view) {
    case "day":
      next.setDate(next.getDate() + direction);
      break;
    case "week":
      next.setDate(next.getDate() + direction * 7);
      break;
    case "month":
      next.setMonth(next.getMonth() + direction);
      break;
    case "year":
      next.setFullYear(next.getFullYear() + direction);
      break;
  }
  return next;
}

/** True when the bounds for `anchor` match the bounds of today under the same view. */
export function isCurrentPeriod(view: ViewRange, anchor: Date, now: Date = new Date()): boolean {
  return viewRangeBounds(view, anchor).start.getTime() === viewRangeBounds(view, now).start.getTime();
}

/** Parse a YYYY-MM-DD string into a local-midnight Date. Returns null on invalid input. */
export function parseAnchorDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (
    date.getFullYear() !== Number(y) ||
    date.getMonth() !== Number(m) - 1 ||
    date.getDate() !== Number(d)
  ) {
    return null;
  }
  return date;
}

/** Format a Date as YYYY-MM-DD using local-time calendar fields. */
export function toISODateAnchor(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Filter items whose `date` falls inside the bounds (inclusive start, exclusive end). */
export function filterByBounds<T extends { date: Date | string }>(
  items: T[],
  bounds: ViewBounds,
): T[] {
  return items.filter((i) => {
    const d = typeof i.date === "string" ? new Date(i.date) : i.date;
    return d >= bounds.start && d < bounds.end;
  });
}
