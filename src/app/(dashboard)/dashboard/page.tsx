import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import {
  trackerMetrics,
  trackerEntries,
} from "@/db/schema";
import { eq, and, gte, lt, desc } from "drizzle-orm";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const metrics = await db
    .select()
    .from(trackerMetrics)
    .where(
      and(
        eq(trackerMetrics.archived, false),
        eq(trackerMetrics.hidden, false)
      )
    )
    .orderBy(trackerMetrics.sortOrder);

  const todayEntries = await db
    .select({
      id: trackerEntries.id,
      metricId: trackerEntries.metricId,
      value: trackerEntries.value,
      date: trackerEntries.date,
    })
    .from(trackerEntries)
    .where(
      and(
        gte(trackerEntries.date, today),
        lt(trackerEntries.date, tomorrow)
      )
    );

  const recentEntries = await db
    .select({
      id: trackerEntries.id,
      metricId: trackerEntries.metricId,
      value: trackerEntries.value,
      date: trackerEntries.date,
    })
    .from(trackerEntries)
    .where(gte(trackerEntries.date, weekAgo))
    .orderBy(desc(trackerEntries.date))
    .limit(20);

  return (
    <DashboardClient
      metrics={metrics}
      todayEntries={todayEntries.map((e) => ({
        ...e,
        date: e.date.toISOString(),
      }))}
      recentEntries={recentEntries.map((e) => ({
        ...e,
        date: e.date.toISOString(),
      }))}
    />
  );
}
