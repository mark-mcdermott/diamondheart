"use server";

import { getCurrentUser } from "@/lib/auth";
import { type TimeRange, getDateRange } from "@/lib/chart-utils";
import { totalsBetween as medicalTotals } from "@/server/api/medical";
import { dailyTotals as workoutDailyTotals } from "@/server/api/workout";
import { totals as entertainmentTotals } from "@/server/api/entertainment";

export async function getMeditationChartData(range: TimeRange) {
  const session = await getCurrentUser();
  if (!session) return [];

  const { start, end } = getDateRange(range);

  const rows = await db
    .select({
      date: sql<string>`DATE(${meditationSessions.date})`,
      totalMinutes: sql<number>`COALESCE(SUM(${meditationSessions.duration}), 0) / 60`,
      count: sql<number>`COUNT(*)`,
    })
    .from(meditationSessions)
    .where(and(eq(meditationSessions.userId, session.userId), gte(meditationSessions.date, start), lte(meditationSessions.date, end)))
    .groupBy(sql`DATE(${meditationSessions.date})`)
    .orderBy(sql`DATE(${meditationSessions.date})`);

  return rows.map((r) => ({
    date: String(r.date),
    minutes: Number(r.totalMinutes),
    sessions: Number(r.count),
  }));
}

export async function getWorkoutChartData(range: TimeRange) {
  const session = await getCurrentUser();
  if (!session) return [];

  const { start, end } = getDateRange(range);
  return workoutDailyTotals(session.userId, start, end);
}

export async function getEntertainmentChartData() {
  const session = await getCurrentUser();
  if (!session) return { byType: [], byStatus: [] };

  return entertainmentTotals(session.userId);
}
