"use server";

import { getCurrentUser } from "@/lib/auth";
import { type TimeRange, getDateRange } from "@/lib/chart-utils";
import { dailyTotals as meditationDailyTotals } from "@/server/api/meditation";
import { totalsBetween as medicalTotals } from "@/server/api/medical";
import { dailyTotals as workoutDailyTotals } from "@/server/api/workout";
import { totals as entertainmentTotals } from "@/server/api/entertainment";

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
  return workoutDailyTotals(session.userId, start, end);
}

export async function getEntertainmentChartData() {
  const session = await getCurrentUser();
  if (!session) return { byType: [], byStatus: [] };

  return entertainmentTotals(session.userId);
}
