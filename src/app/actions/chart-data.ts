"use server";

import { db } from "@/db";
import {
  workouts,
  workoutSets,
  entertainmentItems,
} from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { type TimeRange, getDateRange } from "@/lib/chart-utils";
import { dailyTotals as meditationDailyTotals } from "@/server/api/meditation";
import { totalsBetween as medicalTotals } from "@/server/api/medical";

export async function getMeditationChartData(range: TimeRange) {
  const session = await getCurrentUser();
  if (!session) return [];

  const { start, end } = getDateRange(range);
  return meditationDailyTotals(session.userId, start, end);
}

export async function getWorkoutChartData(range: TimeRange) {
  const session = await getCurrentUser();
  if (!session) return [];

  const { start, end } = getDateRange(range);

  const rows = await db
    .select({
      date: sql<string>`DATE(${workouts.date})`,
      duration: sql<number>`COALESCE(SUM(${workouts.duration}), 0)`,
      volume: sql<number>`COALESCE(SUM(${workoutSets.weight} * ${workoutSets.reps}), 0)`,
      count: sql<number>`COUNT(DISTINCT ${workouts.id})`,
    })
    .from(workouts)
    .leftJoin(workoutSets, eq(workoutSets.workoutId, workouts.id))
    .where(and(eq(workouts.userId, session.userId), gte(workouts.date, start), lte(workouts.date, end)))
    .groupBy(sql`DATE(${workouts.date})`)
    .orderBy(sql`DATE(${workouts.date})`);

  return rows.map((r) => ({
    date: String(r.date),
    duration: Number(r.duration),
    volume: Number(r.volume),
    sessions: Number(r.count),
  }));
}

export async function getMedicalChartData(range: TimeRange) {
  const session = await getCurrentUser();
  if (!session) return { byType: [], bySeverity: [] };

  const { start, end } = getDateRange(range);
  return medicalTotals(session.userId, start, end);
}

export async function getEntertainmentChartData() {
  const session = await getCurrentUser();
  if (!session) return { byType: [], byStatus: [] };

  const byType = await db
    .select({
      type: entertainmentItems.type,
      count: sql<number>`COUNT(*)`,
    })
    .from(entertainmentItems)
    .where(eq(entertainmentItems.userId, session.userId))
    .groupBy(entertainmentItems.type)
    .orderBy(sql`COUNT(*) DESC`);

  const byStatus = await db
    .select({
      status: entertainmentItems.status,
      count: sql<number>`COUNT(*)`,
    })
    .from(entertainmentItems)
    .where(eq(entertainmentItems.userId, session.userId))
    .groupBy(entertainmentItems.status)
    .orderBy(sql`COUNT(*) DESC`);

  return {
    byType: byType.map((r) => ({ type: r.type, count: Number(r.count) })),
    byStatus: byStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
  };
}
