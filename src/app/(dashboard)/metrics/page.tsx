import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import {
  trackerCategories,
  trackerMetrics,
  foodLog,
  foodLogItems,
  trackingItems,
  medicalLogs,
  appointments,
  entertainmentItems,
  workouts,
  meditationSessions,
  financialAccounts,
} from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { MetricsClient } from "./metrics-client";
import { getCategoryNavStatus, getTrackingSectionStatus } from "@/app/actions/nav";

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function MetricsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const [
    categories,
    metrics,
    _categoryNavStatus,
    sectionStatus,
    foodCalories,
    trackingCount,
    medicalCount,
    appointmentCount,
    entertainmentCount,
    workoutCount,
    meditationStats,
    financeAccountCount,
  ] = await Promise.all([
    db.select().from(trackerCategories).where(eq(trackerCategories.userId, session.userId)).orderBy(trackerCategories.sortOrder),
    db.select().from(trackerMetrics).where(and(eq(trackerMetrics.userId, session.userId), eq(trackerMetrics.archived, false))).orderBy(trackerMetrics.sortOrder),
    getCategoryNavStatus(session.userId, []).then(() => null), // placeholder, resolved below
    getTrackingSectionStatus(session.userId),

    // Food: today's total calories
    db
      .select({ total: sql<number>`COALESCE(SUM(${foodLogItems.calories} * ${foodLogItems.quantity}), 0)` })
      .from(foodLog)
      .innerJoin(foodLogItems, eq(foodLogItems.foodLogId, foodLog.id))
      .where(and(eq(foodLog.userId, session.userId), gte(foodLog.date, todayStart()))),

    // Tracking: item count
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(trackingItems)
      .where(eq(trackingItems.userId, session.userId)),

    // Medical: logs in last 7 days
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(medicalLogs)
      .where(and(eq(medicalLogs.userId, session.userId), gte(medicalLogs.date, daysAgo(7)))),

    // Appointments: upcoming
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(appointments)
      .where(and(eq(appointments.userId, session.userId), eq(appointments.status, "upcoming"))),

    // Entertainment: in-progress
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(entertainmentItems)
      .where(and(
        eq(entertainmentItems.userId, session.userId),
        sql`${entertainmentItems.status} IN ('watching', 'reading', 'listening')`
      )),

    // Workout: sessions in last 7 days
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(workouts)
      .where(and(eq(workouts.userId, session.userId), gte(workouts.date, daysAgo(7)))),

    // Meditate: sessions + total minutes in last 7 days
    db
      .select({
        count: sql<number>`COUNT(*)`,
        totalMinutes: sql<number>`COALESCE(SUM(${meditationSessions.duration}), 0) / 60`,
      })
      .from(meditationSessions)
      .where(and(eq(meditationSessions.userId, session.userId), gte(meditationSessions.date, daysAgo(7)))),

    // Finances: number of accounts
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(financialAccounts)
      .where(and(eq(financialAccounts.userId, session.userId), eq(financialAccounts.archived, false))),
  ]);

  // Resolve category nav status (needed the categories list)
  const resolvedCategoryNavStatus = await getCategoryNavStatus(
    session.userId,
    categories.map((c) => c.id)
  );

  const sectionSummaries: Record<string, string> = {
    food: `${foodCalories[0]?.total ?? 0} cal today`,
    tracking: `${trackingCount[0]?.count ?? 0} items tracked`,
    medical: `${medicalCount[0]?.count ?? 0} logs this week`,
    appointments: `${appointmentCount[0]?.count ?? 0} upcoming`,
    entertainment: `${entertainmentCount[0]?.count ?? 0} in progress`,
    workout: `${workoutCount[0]?.count ?? 0} sessions this week`,
    meditate: `${meditationStats[0]?.count ?? 0} sessions, ${meditationStats[0]?.totalMinutes ?? 0} min this week`,
    finances: `${financeAccountCount[0]?.count ?? 0} accounts tracked`,
  };

  return (
    <MetricsClient
      categories={categories}
      metrics={metrics}
      categoryNavStatus={resolvedCategoryNavStatus}
      sectionStatus={sectionStatus}
      sectionSummaries={sectionSummaries}
    />
  );
}
