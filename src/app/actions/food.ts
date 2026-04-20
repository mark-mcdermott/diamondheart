"use server";

import { db } from "@/db";
import {
  foodLog,
  foodLogItems,
  customFoods,
  favoriteFoods,
  favoriteMeals,
  favoriteMealItems,
} from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { parseDate } from "@/lib/dates";
import { revalidatePath } from "next/cache";

type Result = { success: boolean; error?: string };

function dayRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

async function findOrCreateLog(userId: string, mealType: string, date: Date) {
  const { start, end } = dayRange(date);
  const [existing] = await db
    .select()
    .from(foodLog)
    .where(
      and(
        eq(foodLog.userId, userId),
        eq(foodLog.mealType, mealType),
        gte(foodLog.date, start),
        lte(foodLog.date, end)
      )
    )
    .limit(1);

  if (existing) return existing.id;

  const id = crypto.randomUUID();
  await db.insert(foodLog).values({ id, userId, date: start, mealType });
  return id;
}

export async function addFood(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const mealType = formData.get("mealType") as string;
  const name = formData.get("name") as string;
  if (!mealType || !name) return { success: false, error: "Meal type and food name are required" };

  const date = parseDate((formData.get("date") as string) || undefined);
  const logId = await findOrCreateLog(session.userId, mealType, date);

  await db.insert(foodLogItems).values({
    id: crypto.randomUUID(),
    foodLogId: logId,
    name,
    fdcId: (formData.get("fdcId") as string) || null,
    servingSize: parseInt(formData.get("servingSize") as string) || 100,
    servingUnit: (formData.get("servingUnit") as string) || "g",
    calories: parseInt(formData.get("calories") as string) || 0,
    protein: parseInt(formData.get("protein") as string) || 0,
    carbs: parseInt(formData.get("carbs") as string) || 0,
    fat: parseInt(formData.get("fat") as string) || 0,
    quantity: parseInt(formData.get("quantity") as string) || 1,
  });

  revalidatePath("/food");
  return { success: true };
}

export async function removeFood(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const itemId = formData.get("itemId") as string;
  if (!itemId) return { success: false, error: "Item ID is required" };

  const [item] = await db
    .select({ id: foodLogItems.id, userId: foodLog.userId })
    .from(foodLogItems)
    .innerJoin(foodLog, eq(foodLogItems.foodLogId, foodLog.id))
    .where(eq(foodLogItems.id, itemId))
    .limit(1);

  if (!item || item.userId !== session.userId) {
    return { success: false, error: "Not authorized" };
  }

  await db.delete(foodLogItems).where(eq(foodLogItems.id, itemId));
  revalidatePath("/food");
  return { success: true };
}

export async function createCustomFood(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const name = formData.get("name") as string;
  if (!name) return { success: false, error: "Food name is required" };

  await db.insert(customFoods).values({
    id: crypto.randomUUID(),
    userId: session.userId,
    name,
    calories: parseInt(formData.get("calories") as string) || 0,
    protein: parseInt(formData.get("protein") as string) || 0,
    carbs: parseInt(formData.get("carbs") as string) || 0,
    fat: parseInt(formData.get("fat") as string) || 0,
    servingSize: parseInt(formData.get("servingSize") as string) || 100,
    servingUnit: (formData.get("servingUnit") as string) || "g",
  });

  revalidatePath("/food");
  return { success: true };
}

export async function favoriteFood(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const name = formData.get("name") as string;
  if (!name) return { success: false, error: "Food name is required" };

  await db.insert(favoriteFoods).values({
    id: crypto.randomUUID(),
    userId: session.userId,
    name,
    fdcId: (formData.get("fdcId") as string) || null,
    servingSize: parseInt(formData.get("servingSize") as string) || 100,
    servingUnit: (formData.get("servingUnit") as string) || "g",
    calories: parseInt(formData.get("calories") as string) || 0,
    protein: parseInt(formData.get("protein") as string) || 0,
    carbs: parseInt(formData.get("carbs") as string) || 0,
    fat: parseInt(formData.get("fat") as string) || 0,
  });

  revalidatePath("/food");
  return { success: true };
}

export async function unfavoriteFood(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const favoriteId = formData.get("favoriteId") as string;
  if (!favoriteId) return { success: false, error: "Favorite ID is required" };

  await db.delete(favoriteFoods).where(
    and(eq(favoriteFoods.id, favoriteId), eq(favoriteFoods.userId, session.userId))
  );

  revalidatePath("/food");
  return { success: true };
}

export async function saveFavoriteMeal(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const name = formData.get("mealName") as string;
  const mealType = formData.get("mealType") as string;
  if (!name || !mealType) return { success: false, error: "Meal name is required" };

  const date = parseDate((formData.get("date") as string) || undefined);
  const { start, end } = dayRange(date);

  const dayItems = await db
    .select({
      name: foodLogItems.name,
      fdcId: foodLogItems.fdcId,
      servingSize: foodLogItems.servingSize,
      servingUnit: foodLogItems.servingUnit,
      calories: foodLogItems.calories,
      protein: foodLogItems.protein,
      carbs: foodLogItems.carbs,
      fat: foodLogItems.fat,
      quantity: foodLogItems.quantity,
    })
    .from(foodLogItems)
    .innerJoin(foodLog, eq(foodLogItems.foodLogId, foodLog.id))
    .where(
      and(
        eq(foodLog.userId, session.userId),
        eq(foodLog.mealType, mealType),
        gte(foodLog.date, start),
        lte(foodLog.date, end)
      )
    );

  if (dayItems.length === 0) return { success: false, error: "No items in this meal" };

  const mealId = crypto.randomUUID();
  await db.insert(favoriteMeals).values({ id: mealId, userId: session.userId, name });

  for (const item of dayItems) {
    await db.insert(favoriteMealItems).values({
      id: crypto.randomUUID(),
      favoriteMealId: mealId,
      ...item,
    });
  }

  revalidatePath("/food");
  return { success: true };
}

export async function deleteFavoriteMeal(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const mealId = formData.get("mealId") as string;
  if (!mealId) return { success: false, error: "Meal ID is required" };

  await db.delete(favoriteMeals).where(
    and(eq(favoriteMeals.id, mealId), eq(favoriteMeals.userId, session.userId))
  );

  revalidatePath("/food");
  return { success: true };
}

export async function logFavoriteMeal(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const mealId = formData.get("mealId") as string;
  const mealType = formData.get("mealType") as string;
  if (!mealId || !mealType) return { success: false, error: "Meal ID and type are required" };

  const items = await db
    .select()
    .from(favoriteMealItems)
    .where(eq(favoriteMealItems.favoriteMealId, mealId));

  if (items.length === 0) return { success: false, error: "Favorite meal has no items" };

  const date = parseDate((formData.get("date") as string) || undefined);
  const logId = await findOrCreateLog(session.userId, mealType, date);

  for (const item of items) {
    await db.insert(foodLogItems).values({
      id: crypto.randomUUID(),
      foodLogId: logId,
      name: item.name,
      fdcId: item.fdcId,
      servingSize: item.servingSize,
      servingUnit: item.servingUnit,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      quantity: item.quantity,
    });
  }

  revalidatePath("/food");
  return { success: true };
}
