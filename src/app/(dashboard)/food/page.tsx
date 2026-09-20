import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { foodLog, foodLogItems, favoriteFoods, favoriteMeals } from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { parseDate, toISODate } from "@/lib/dates";
import { FoodClient } from "./food-client";
import { FoodOverviewClient } from "./food-overview-client";
import { getUserPreferences } from "@/app/actions/preferences";
import { PageViewToggle } from "@/components/ui/view-toggle";
import { DateNavigator } from "@/components/ui/date-navigator";
import { isViewRange, type ViewRange } from "@/lib/view-range";

export default async function FoodPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const { date: dateParam, view: viewParam } = await searchParams;
  const view: ViewRange = isViewRange(viewParam) ? viewParam : "day";

  if (view !== "day") {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h2>Food</h2>
            <p className="text-muted-foreground mt-1">Review macros over time</p>
          </div>
          <DateNavigator />
          <PageViewToggle defaultRange="day" />
        </div>
        <FoodOverviewClient />
      </div>
    );
  }

  const selectedDate = parseDate(dateParam);
  const nextDay = new Date(selectedDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const dayLogs = await db
    .select({
      logId: foodLog.id,
      mealType: foodLog.mealType,
      itemId: foodLogItems.id,
      itemName: foodLogItems.name,
      fdcId: foodLogItems.fdcId,
      servingSize: foodLogItems.servingSize,
      servingUnit: foodLogItems.servingUnit,
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
        gte(foodLog.date, selectedDate),
        lte(foodLog.date, nextDay)
      )
    );

  const meals: Record<string, Array<{
    id: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    quantity: number;
  }>> = { breakfast: [], lunch: [], dinner: [], snack: [] };

  const { targets } = await getUserPreferences(session.userId);
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

  for (const row of dayLogs) {
    if (!row.itemId) continue;
    const item = {
      id: row.itemId,
      name: row.itemName!,
      calories: row.calories!,
      protein: row.protein!,
      carbs: row.carbs!,
      fat: row.fat!,
      quantity: row.quantity!,
    };
    const meal = row.mealType as string;
    if (meals[meal]) meals[meal].push(item);
    totals.calories += item.calories * item.quantity;
    totals.protein += item.protein * item.quantity;
    totals.carbs += item.carbs * item.quantity;
    totals.fat += item.fat * item.quantity;
  }

  // Fetch favorites
  const userFavFoods = await db
    .select()
    .from(favoriteFoods)
    .where(eq(favoriteFoods.userId, session.userId))
    .orderBy(desc(favoriteFoods.createdAt));

  const userFavMeals = await db
    .select()
    .from(favoriteMeals)
    .where(eq(favoriteMeals.userId, session.userId))
    .orderBy(desc(favoriteMeals.createdAt));

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-end mb-2">
        <PageViewToggle defaultRange="day" />
      </div>
      <FoodClient
        meals={meals}
        totals={totals}
        targets={targets}
        favoriteFoods={userFavFoods.map((f) => ({
          id: f.id,
          name: f.name,
          fdcId: f.fdcId,
          servingSize: f.servingSize,
          servingUnit: f.servingUnit,
          calories: f.calories,
          protein: f.protein,
          carbs: f.carbs,
          fat: f.fat,
        }))}
        favoriteMeals={userFavMeals.map((m) => ({
          id: m.id,
          name: m.name,
        }))}
        selectedDate={toISODate(selectedDate)}
      />
    </div>
  );
}
