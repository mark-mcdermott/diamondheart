"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { parseNumberField, parsePositiveNumberField } from "@/lib/numbers";
import * as food from "@/server/api/food";
import { MEAL_TYPES, type MealType } from "@/server/api/_lib/schemas";
import { asResult, type ActionResult } from "./api-result";

/** Thin wrappers over `src/server/api/food.ts`, kept until Phase 3 moves the client onto `/api/food/*`. */

export type { ActionResult };

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function mealType(formData: FormData): MealType | null {
  const value = text(formData, "mealType");
  return (MEAL_TYPES as readonly string[]).includes(value) ? (value as MealType) : null;
}

function macros(formData: FormData) {
  return {
    servingSize: parsePositiveNumberField(formData.get("servingSize"), 100),
    servingUnit: text(formData, "servingUnit") || "g",
    calories: parseNumberField(formData.get("calories"), 0),
    protein: parseNumberField(formData.get("protein"), 0),
    carbs: parseNumberField(formData.get("carbs"), 0),
    fat: parseNumberField(formData.get("fat"), 0),
  };
}

async function run(work: (userId: string) => Promise<unknown>): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };
  const result = await asResult(() => work(session.userId));
  revalidatePath("/food");
  return result;
}

export async function addFood(formData: FormData): Promise<ActionResult> {
  const meal = mealType(formData);
  const name = text(formData, "name");
  if (!meal || !name) return { success: false, error: "Meal type and food name are required" };
  return run((userId) =>
    food.logFood(userId, {
      mealType: meal,
      name,
      date: text(formData, "date") || undefined,
      fdcId: text(formData, "fdcId") || null,
      quantity: parsePositiveNumberField(formData.get("quantity"), 1),
      ...macros(formData),
    })
  );
}

export async function removeFood(formData: FormData): Promise<ActionResult> {
  const itemId = text(formData, "itemId");
  if (!itemId) return { success: false, error: "Item ID is required" };
  return run((userId) => food.removeFoodItem(userId, itemId));
}

export async function createCustomFood(formData: FormData): Promise<ActionResult> {
  const name = text(formData, "name");
  if (!name) return { success: false, error: "Food name is required" };
  return run((userId) => food.createCustomFood(userId, { name, ...macros(formData) }));
}

export async function favoriteFood(formData: FormData): Promise<ActionResult> {
  const name = text(formData, "name");
  if (!name) return { success: false, error: "Food name is required" };
  return run((userId) =>
    food.createFavoriteFood(userId, { name, fdcId: text(formData, "fdcId") || null, ...macros(formData) })
  );
}

export async function unfavoriteFood(formData: FormData): Promise<ActionResult> {
  const favoriteId = text(formData, "favoriteId");
  if (!favoriteId) return { success: false, error: "Favorite ID is required" };
  return run((userId) => food.deleteFavoriteFood(userId, favoriteId));
}

export async function saveFavoriteMeal(formData: FormData): Promise<ActionResult> {
  const name = text(formData, "mealName");
  const meal = mealType(formData);
  if (!name || !meal) return { success: false, error: "Meal name is required" };
  return run((userId) => food.saveMeal(userId, { name, mealType: meal, date: text(formData, "date") || undefined }));
}

export async function deleteFavoriteMeal(formData: FormData): Promise<ActionResult> {
  const mealId = text(formData, "mealId");
  if (!mealId) return { success: false, error: "Meal ID is required" };
  return run((userId) => food.deleteFavoriteMeal(userId, mealId));
}

export async function logFavoriteMeal(formData: FormData): Promise<ActionResult> {
  const mealId = text(formData, "mealId");
  const meal = mealType(formData);
  if (!mealId || !meal) return { success: false, error: "Meal ID and type are required" };
  return run((userId) => food.logMeal(userId, mealId, { mealType: meal, date: text(formData, "date") || undefined }));
}
