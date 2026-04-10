import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import {
  trackerMetrics,
  trackerEntries,
  foodLog,
  foodLogItems,
} from "@/db/schema";
import { eq, and, gte, lt, lte, desc } from "drizzle-orm";
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

  // Fetch today's food data
  const todayFood = await db
    .select({
      mealType: foodLog.mealType,
      itemName: foodLogItems.name,
      calories: foodLogItems.calories,
      protein: foodLogItems.protein,
      carbs: foodLogItems.carbs,
      fat: foodLogItems.fat,
      quantity: foodLogItems.quantity,
    })
    .from(foodLog)
    .leftJoin(foodLogItems, eq(foodLogItems.foodLogId, foodLog.id))
    .where(
      and(
        eq(foodLog.userId, session.userId),
        gte(foodLog.date, today),
        lte(foodLog.date, tomorrow)
      )
    );

  const foodTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const mealSummaries: Record<string, { count: number; calories: number }> = {
    breakfast: { count: 0, calories: 0 },
    lunch: { count: 0, calories: 0 },
    dinner: { count: 0, calories: 0 },
    snack: { count: 0, calories: 0 },
  };

  for (const row of todayFood) {
    if (!row.itemName) continue;
    const qty = row.quantity ?? 1;
    foodTotals.calories += (row.calories ?? 0) * qty;
    foodTotals.protein += (row.protein ?? 0) * qty;
    foodTotals.carbs += (row.carbs ?? 0) * qty;
    foodTotals.fat += (row.fat ?? 0) * qty;
    const meal = row.mealType as string;
    if (mealSummaries[meal]) {
      mealSummaries[meal].count += 1;
      mealSummaries[meal].calories += (row.calories ?? 0) * qty;
    }
  }

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
      foodTotals={foodTotals}
      mealSummaries={mealSummaries}
    />
  );
}
