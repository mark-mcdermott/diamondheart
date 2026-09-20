"use server";

import { db } from "@/db";
import {
  meditationSessions,
  workouts,
  workoutSets,
  medicalLogs,
  entertainmentItems,
} from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { type TimeRange, getDateRange } from "@/lib/chart-utils";
import { dailyTotals } from "@/server/api/food";

export async function getFoodChartData(range: TimeRange) {
  const session = await getCurrentUser();
  if (!session) return [];

  const { start, end } = getDateRange(range);
  return dailyTotals(session.userId, start, end);
}

export async function getFoodDailyTotals(startISO: string, endISO: string) {
  const session = await getCurrentUser();
  if (!session) return [];

  const start = new Date(startISO);
  const end = new Date(endISO);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

  return (await dailyTotals(session.userId, start, end)).map((day) => ({
    date: day.date,
    calories: Math.round(day.calories),
    protein: Math.round(day.protein),
    carbs: Math.round(day.carbs),
    fat: Math.round(day.fat),
  }));
}

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

  const byType = await db
    .select({
      type: medicalLogs.type,
      count: sql<number>`COUNT(*)`,
    })
    .from(medicalLogs)
    .where(and(eq(medicalLogs.userId, session.userId), gte(medicalLogs.date, start), lte(medicalLogs.date, end)))
    .groupBy(medicalLogs.type)
    .orderBy(sql`COUNT(*) DESC`);

  const bySeverity = await db
    .select({
      date: sql<string>`DATE(${medicalLogs.date})`,
      avgSeverity: sql<number>`COALESCE(AVG(${medicalLogs.severity}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(medicalLogs)
    .where(and(
      eq(medicalLogs.userId, session.userId),
      gte(medicalLogs.date, start),
      lte(medicalLogs.date, end),
      sql`${medicalLogs.severity} IS NOT NULL`
    ))
    .groupBy(sql`DATE(${medicalLogs.date})`)
    .orderBy(sql`DATE(${medicalLogs.date})`);

  return {
    byType: byType.map((r) => ({ type: r.type, count: Number(r.count) })),
    bySeverity: bySeverity.map((r) => ({
      date: String(r.date),
      avgSeverity: Math.round(Number(r.avgSeverity) * 10) / 10,
      count: Number(r.count),
    })),
  };
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
