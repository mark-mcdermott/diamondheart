import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { foodLog, foodLogItems, favoriteFoods, favoriteMeals } from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { parseDate, toISODate } from "@/lib/dates";
import { FoodClient } from "./food-client";

export default async function FoodPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const { date: dateParam } = await searchParams;
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
    <FoodClient
      meals={meals}
      totals={totals}
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
  );
}
