import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { trackerEntries, trackerMetrics, type TrackerMetric } from "@/db/schema";
import { dayBounds, parseDate, toISODate } from "@/lib/dates";
import { readDay, type MacroTotals } from "./food";
import type { ApiHandler } from "./_lib/context";
import { requireSession } from "./_lib/guard";
import { HttpError, fail, handler, json } from "./_lib/http";
import { MEAL_TYPES, calendarDay, type MealType } from "./_lib/schemas";

export interface DashboardEntry {
  id: string;
  metricId: string;
  value: string;
  date: Date;
}

export interface Dashboard {
  date: string;
  /** Visible, non-archived metrics in sort order. */
  metrics: TrackerMetric[];
  todayEntries: DashboardEntry[];
  /** The last twenty entries from the seven days before the date. */
  recentEntries: DashboardEntry[];
  /** Per metric, per day totals over those seven days; non-numeric values count as 1. */
  sparklines: Record<string, { date: string; value: number }[]>;
  food: {
    totals: MacroTotals;
    meals: Record<MealType, { count: number; calories: number }>;
  };
}

/** Everything the dashboard screen shows for one day, in one read. */
export async function readDashboard(userId: string, date: Date): Promise<Dashboard> {
  const { start, end } = dayBounds(date);
  const weekAgo = new Date(start);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const entryColumns = {
    id: trackerEntries.id,
    metricId: trackerEntries.metricId,
    value: trackerEntries.value,
    date: trackerEntries.date,
  };

  const [metrics, todayEntries, recentEntries, sparklineRows, day] = await Promise.all([
    db
      .select()
      .from(trackerMetrics)
      .where(and(eq(trackerMetrics.userId, userId), eq(trackerMetrics.archived, false), eq(trackerMetrics.hidden, false)))
      .orderBy(trackerMetrics.sortOrder),
    db
      .select(entryColumns)
      .from(trackerEntries)
      .where(and(eq(trackerEntries.userId, userId), gte(trackerEntries.date, start), lt(trackerEntries.date, end))),
    db
      .select(entryColumns)
      .from(trackerEntries)
      .where(and(eq(trackerEntries.userId, userId), gte(trackerEntries.date, weekAgo)))
      .orderBy(desc(trackerEntries.date))
      .limit(20),
    db
      .select({
        metricId: trackerEntries.metricId,
        date: sql<string>`DATE(${trackerEntries.date})`,
        total: sql<number>`COALESCE(SUM(CASE WHEN ${trackerEntries.value} ~ '^[0-9.]+$' THEN CAST(${trackerEntries.value} AS NUMERIC) ELSE 1 END), 0)`,
      })
      .from(trackerEntries)
      .where(and(eq(trackerEntries.userId, userId), gte(trackerEntries.date, weekAgo)))
      .groupBy(trackerEntries.metricId, sql`DATE(${trackerEntries.date})`)
      .orderBy(sql`DATE(${trackerEntries.date})`),
    readDay(userId, start),
  ]);

  const sparklines: Record<string, { date: string; value: number }[]> = {};
  for (const row of sparklineRows) {
    (sparklines[row.metricId] ??= []).push({ date: String(row.date), value: Number(row.total) });
  }

  const meals = Object.fromEntries(
    MEAL_TYPES.map((meal) => [
      meal,
      {
        count: day.meals[meal].length,
        calories: day.meals[meal].reduce((sum, item) => sum + item.calories * item.quantity, 0),
      },
    ])
  ) as Record<MealType, { count: number; calories: number }>;

  return {
    date: toISODate(start),
    metrics,
    todayEntries,
    recentEntries,
    sparklines,
    food: { totals: day.totals, meals },
  };
}

export const GET: ApiHandler = ({ request }) =>
  handler(async () => {
    const { userId } = await requireSession(request);
    const raw = new URL(request.url).searchParams.get("date");
    let date = new Date();
    if (raw) {
      const parsed = calendarDay.safeParse(raw);
      if (!parsed.success) throw new HttpError(fail(422, "Validation failed", { date: ["Must be YYYY-MM-DD"] }));
      date = parseDate(parsed.data);
    }
    return json(await readDashboard(userId, date));
  });
