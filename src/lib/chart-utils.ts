export type TimeRange = "week" | "month" | "quarter" | "year" | "5year";

export const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "3M" },
  { value: "year", label: "Year" },
  { value: "5year", label: "5Y" },
];

export function getDateRange(range: TimeRange): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  switch (range) {
    case "week":
      start.setDate(start.getDate() - 6);
      break;
    case "month":
      start.setDate(start.getDate() - 29);
      break;
    case "quarter":
      start.setDate(start.getDate() - 89);
      break;
    case "year":
      start.setFullYear(start.getFullYear() - 1);
      break;
    case "5year":
      start.setFullYear(start.getFullYear() - 5);
      break;
  }

  return { start, end };
}

/**
 * Format a date for chart axis labels based on the time range.
 */
export function formatDateLabel(dateStr: string, range: TimeRange): string {
  const d = new Date(dateStr);
  switch (range) {
    case "week":
      return d.toLocaleDateString("en-US", { weekday: "short" });
    case "month":
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    case "quarter":
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    case "year":
      return d.toLocaleDateString("en-US", { month: "short" });
    case "5year":
      return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }
}

/**
 * Generate all date keys in a range for filling gaps.
 * Uses YYYY-MM-DD format for day-level granularity, or YYYY-MM for month+.
 */
export function generateDateKeys(range: TimeRange): string[] {
  const { start, end } = getDateRange(range);
  const keys: string[] = [];

  if (range === "year" || range === "5year") {
    // Monthly granularity
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else {
    // Daily granularity
    const cursor = new Date(start);
    while (cursor <= end) {
      keys.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return keys;
}

/**
 * Get the date key for a given date based on the time range granularity.
 */
export function toDateKey(date: Date | string, range: TimeRange): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (range === "year" || range === "5year") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return d.toISOString().slice(0, 10);
}

// Chart color palette matching the app's design system
export const CHART_COLORS = {
  primary: "#a57cf4",
  secondary: "#fad2e6",
  accent: "#fa40f2",
  blue: "#3b82f6",
  green: "#22c55e",
  amber: "#f59e0b",
  rose: "#f43f5e",
  cyan: "#06b6d4",
  indigo: "#6366f1",
  emerald: "#10b981",
};

export const MACRO_COLORS = {
  protein: "#3b82f6",
  carbs: "#f59e0b",
  fat: "#f43f5e",
  calories: "#a57cf4",
};

export const CHART_PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.blue,
  CHART_COLORS.green,
  CHART_COLORS.amber,
  CHART_COLORS.rose,
  CHART_COLORS.cyan,
  CHART_COLORS.indigo,
  CHART_COLORS.emerald,
];
