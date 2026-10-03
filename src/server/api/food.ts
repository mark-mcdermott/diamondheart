import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  customFoods,
  favoriteFoods,
  favoriteMealItems,
  favoriteMeals,
  foodLog,
  foodLogItems,
} from "@/db/schema";
import { dayBounds, parseDate, toISODate } from "@/lib/dates";
import type { ApiHandler } from "./_lib/context";
import { requireSession } from "./_lib/guard";
import { HttpError, fail, handler, json, noContent, notFound, readJson } from "./_lib/http";
import {
  MEAL_TYPES,
  calendarDay,
  createCustomFoodSchema,
  createFavoriteFoodSchema,
  logFoodSchema,
  logMealSchema,
  saveMealSchema,
  type CreateCustomFood,
  type CreateFavoriteFood,
  type LogFood,
  type LogMeal,
  type MealType,
  type SaveMeal,
} from "./_lib/schemas";

export type FoodLogItem = typeof foodLogItems.$inferSelect;
export type CustomFood = typeof customFoods.$inferSelect;
export type FavoriteFood = typeof favoriteFoods.$inferSelect;
export type FavoriteMeal = typeof favoriteMeals.$inferSelect & { items: (typeof favoriteMealItems.$inferSelect)[] };

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodDay {
  date: string;
  meals: Record<MealType, FoodLogItem[]>;
  totals: MacroTotals;
}

function emptyMeals(): Record<MealType, FoodLogItem[]> {
  return { breakfast: [], lunch: [], dinner: [], snack: [] };
}

function isMealType(value: string): value is MealType {
  return (MEAL_TYPES as readonly string[]).includes(value);
}

/** The day's log as the Food page shows it: items by meal, and totals that respect quantity. */
export async function readDay(userId: string, date: Date): Promise<FoodDay> {
  const { start, end } = dayBounds(date);
  const rows = await db
    .select({ mealType: foodLog.mealType, item: foodLogItems })
    .from(foodLog)
    .innerJoin(foodLogItems, eq(foodLogItems.foodLogId, foodLog.id))
    .where(and(eq(foodLog.userId, userId), gte(foodLog.date, start), lt(foodLog.date, end)))
    .orderBy(foodLogItems.createdAt);

  const meals = emptyMeals();
  const totals: MacroTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const { mealType, item } of rows) {
    if (!isMealType(mealType)) continue;
    meals[mealType].push(item);
    totals.calories += item.calories * item.quantity;
    totals.protein += item.protein * item.quantity;
    totals.carbs += item.carbs * item.quantity;
    totals.fat += item.fat * item.quantity;
  }
  return { date: toISODate(start), meals, totals };
}

/** Per-day totals across a range, for the overview and the charts. Days with nothing logged are absent. */
export async function dailyTotals(
  userId: string,
  from: Date,
  to: Date
): Promise<(MacroTotals & { date: string })[]> {
  const rows = await db
    .select({
      date: sql<string>`DATE(${foodLog.date})`,
      calories: sql<number>`COALESCE(SUM(${foodLogItems.calories} * ${foodLogItems.quantity}), 0)`,
      protein: sql<number>`COALESCE(SUM(${foodLogItems.protein} * ${foodLogItems.quantity}), 0)`,
      carbs: sql<number>`COALESCE(SUM(${foodLogItems.carbs} * ${foodLogItems.quantity}), 0)`,
      fat: sql<number>`COALESCE(SUM(${foodLogItems.fat} * ${foodLogItems.quantity}), 0)`,
    })
    .from(foodLog)
    .innerJoin(foodLogItems, eq(foodLogItems.foodLogId, foodLog.id))
    .where(and(eq(foodLog.userId, userId), gte(foodLog.date, from), lt(foodLog.date, to)))
    .groupBy(sql`DATE(${foodLog.date})`)
    .orderBy(sql`DATE(${foodLog.date})`);

  return rows.map((r) => ({
    date: String(r.date),
    calories: Number(r.calories),
    protein: Number(r.protein),
    carbs: Number(r.carbs),
    fat: Number(r.fat),
  }));
}

/** The `food_log` row for one meal on one day, created on first use. */
async function findOrCreateLog(userId: string, mealType: MealType, date: Date): Promise<string> {
  const { start, end } = dayBounds(date);
  const [existing] = await db
    .select({ id: foodLog.id })
    .from(foodLog)
    .where(and(eq(foodLog.userId, userId), eq(foodLog.mealType, mealType), gte(foodLog.date, start), lt(foodLog.date, end)))
    .limit(1);
  if (existing) return existing.id;

  const id = crypto.randomUUID();
  await db.insert(foodLog).values({ id, userId, date: start, mealType });
  return id;
}

export async function logFood(userId: string, input: LogFood): Promise<FoodLogItem> {
  const logId = await findOrCreateLog(userId, input.mealType, parseDate(input.date));
  const [item] = await db
    .insert(foodLogItems)
    .values({
      id: crypto.randomUUID(),
      foodLogId: logId,
      name: input.name,
      fdcId: input.fdcId ?? null,
      servingSize: input.servingSize ?? 100,
      servingUnit: input.servingUnit ?? "g",
      calories: input.calories ?? 0,
      protein: input.protein ?? 0,
      carbs: input.carbs ?? 0,
      fat: input.fat ?? 0,
      quantity: input.quantity ?? 1,
    })
    .returning();
  return item;
}

/** Items have no `user_id`; ownership is the parent log's, checked in the same query. */
export async function removeFoodItem(userId: string, itemId: string): Promise<void> {
  const [owned] = await db
    .select({ id: foodLogItems.id })
    .from(foodLogItems)
    .innerJoin(foodLog, eq(foodLogItems.foodLogId, foodLog.id))
    .where(and(eq(foodLogItems.id, itemId), eq(foodLog.userId, userId)))
    .limit(1);
  if (!owned) throw new HttpError(notFound("Food item not found"));
  await db.delete(foodLogItems).where(eq(foodLogItems.id, owned.id));
}

export function listCustomFoods(userId: string): Promise<CustomFood[]> {
  return db.select().from(customFoods).where(eq(customFoods.userId, userId)).orderBy(desc(customFoods.createdAt));
}

export async function createCustomFood(userId: string, input: CreateCustomFood): Promise<CustomFood> {
  const [food] = await db
    .insert(customFoods)
    .values({
      id: crypto.randomUUID(),
      userId,
      name: input.name,
      servingSize: input.servingSize ?? 100,
      servingUnit: input.servingUnit ?? "g",
      calories: input.calories ?? 0,
      protein: input.protein ?? 0,
      carbs: input.carbs ?? 0,
      fat: input.fat ?? 0,
    })
    .returning();
  return food;
}

export async function deleteCustomFood(userId: string, id: string): Promise<void> {
  const deleted = await db
    .delete(customFoods)
    .where(and(eq(customFoods.id, id), eq(customFoods.userId, userId)))
    .returning({ id: customFoods.id });
  if (deleted.length === 0) throw new HttpError(notFound("Custom food not found"));
}

export function listFavoriteFoods(userId: string): Promise<FavoriteFood[]> {
  return db.select().from(favoriteFoods).where(eq(favoriteFoods.userId, userId)).orderBy(desc(favoriteFoods.createdAt));
}

export async function createFavoriteFood(userId: string, input: CreateFavoriteFood): Promise<FavoriteFood> {
  if (input.customFoodId) {
    const [owned] = await db
      .select({ id: customFoods.id })
      .from(customFoods)
      .where(and(eq(customFoods.id, input.customFoodId), eq(customFoods.userId, userId)))
      .limit(1);
    if (!owned) throw new HttpError(notFound("Custom food not found"));
  }
  const [favorite] = await db
    .insert(favoriteFoods)
    .values({
      id: crypto.randomUUID(),
      userId,
      name: input.name,
      fdcId: input.fdcId ?? null,
      customFoodId: input.customFoodId ?? null,
      servingSize: input.servingSize ?? 100,
      servingUnit: input.servingUnit ?? "g",
      calories: input.calories ?? 0,
      protein: input.protein ?? 0,
      carbs: input.carbs ?? 0,
      fat: input.fat ?? 0,
    })
    .returning();
  return favorite;
}

export async function deleteFavoriteFood(userId: string, id: string): Promise<void> {
  const deleted = await db
    .delete(favoriteFoods)
    .where(and(eq(favoriteFoods.id, id), eq(favoriteFoods.userId, userId)))
    .returning({ id: favoriteFoods.id });
  if (deleted.length === 0) throw new HttpError(notFound("Favorite not found"));
}

export async function listFavoriteMeals(userId: string): Promise<FavoriteMeal[]> {
  const meals = await db.select().from(favoriteMeals).where(eq(favoriteMeals.userId, userId)).orderBy(desc(favoriteMeals.createdAt));
  if (meals.length === 0) return [];
  const items = await db
    .select()
    .from(favoriteMealItems)
    .where(inArray(favoriteMealItems.favoriteMealId, meals.map((m) => m.id)));
  return meals.map((meal) => ({ ...meal, items: items.filter((i) => i.favoriteMealId === meal.id) }));
}

async function ownedMeal(userId: string, mealId: string): Promise<FavoriteMeal> {
  const [meal] = await db
    .select()
    .from(favoriteMeals)
    .where(and(eq(favoriteMeals.id, mealId), eq(favoriteMeals.userId, userId)))
    .limit(1);
  if (!meal) throw new HttpError(notFound("Favorite meal not found"));
  const items = await db.select().from(favoriteMealItems).where(eq(favoriteMealItems.favoriteMealId, meal.id));
  return { ...meal, items };
}

/** Saves what is logged under one meal on one day as a reusable favourite meal. */
export async function saveMeal(userId: string, input: SaveMeal): Promise<FavoriteMeal> {
  const { start, end } = dayBounds(parseDate(input.date));
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
    .where(and(eq(foodLog.userId, userId), eq(foodLog.mealType, input.mealType), gte(foodLog.date, start), lt(foodLog.date, end)));

  if (dayItems.length === 0) {
    throw new HttpError(fail(422, "Validation failed", { mealType: ["Nothing is logged for that meal"] }));
  }

  const mealId = crypto.randomUUID();
  await db.insert(favoriteMeals).values({ id: mealId, userId, name: input.name });
  await db.insert(favoriteMealItems).values(dayItems.map((item) => ({ id: crypto.randomUUID(), favoriteMealId: mealId, ...item })));
  return ownedMeal(userId, mealId);
}

export async function deleteFavoriteMeal(userId: string, mealId: string): Promise<void> {
  const deleted = await db
    .delete(favoriteMeals)
    .where(and(eq(favoriteMeals.id, mealId), eq(favoriteMeals.userId, userId)))
    .returning({ id: favoriteMeals.id });
  if (deleted.length === 0) throw new HttpError(notFound("Favorite meal not found"));
}

/** Logs every item of a favourite meal under a meal on a day. */
export async function logMeal(userId: string, mealId: string, input: LogMeal): Promise<FoodLogItem[]> {
  const meal = await ownedMeal(userId, mealId);
  if (meal.items.length === 0) {
    throw new HttpError(fail(422, "Validation failed", { mealId: ["This favorite meal has no items"] }));
  }
  const logId = await findOrCreateLog(userId, input.mealType, parseDate(input.date));
  return db
    .insert(foodLogItems)
    .values(
      meal.items.map((item) => ({
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
      }))
    )
    .returning();
}

// --- USDA search -----------------------------------------------------------

interface UsdaNutrient {
  nutrientId: number;
  value: number;
}

interface UsdaFood {
  fdcId: number;
  description?: string;
  dataType?: string;
  brandName?: string;
  brandOwner?: string;
  foodNutrients?: UsdaNutrient[];
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
}

/**
 * Every dataset USDA offers. The reference ones (Foundation, SR Legacy) are
 * generic ingredients; Survey (FNDDS) has prepared dishes as people eat them,
 * "Peanut butter and jelly sandwich" among them; Branded has products off the
 * shelf. The first two alone could not find a box of cereal.
 */
const USDA_DATA_TYPES = ["Foundation", "SR Legacy", "Survey (FNDDS)", "Branded"];
const USDA_PAGE_SIZE = 20;
const USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";

/** USDA's abbreviations for the two units a branded serving comes in. */
const SERVING_UNITS: Record<string, string> = { GRM: "g", g: "g", MLT: "ml", ml: "ml" };

function findNutrient(nutrients: UsdaNutrient[], nutrientId: number): number {
  return nutrients.find((n) => n.nutrientId === nutrientId)?.value ?? 0;
}

export interface FoodSearchResult {
  fdcId: string;
  description: string;
  /** The maker, for a branded product; the generic datasets have none. */
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
  /** "2/3 cup", when the label says so. */
  householdServing?: string;
}

/**
 * One row of the search as the app stores it. USDA reports every nutrient per
 * 100 g whatever the dataset, while a branded food also states its serving;
 * the macros are scaled to that serving so "225 kcal per 40 g" is not
 * silently 225 kcal per 100 g.
 */
export function toFoodSearchResult(food: UsdaFood): FoodSearchResult {
  const nutrients = food.foodNutrients ?? [];
  const servingUnit = SERVING_UNITS[food.servingSizeUnit ?? ""];
  const servingSize = servingUnit && food.servingSize ? Math.round(food.servingSize) : 100;
  const perServing = (nutrientId: number) => Math.round((findNutrient(nutrients, nutrientId) * servingSize) / 100);
  const brand = food.brandName?.trim() || food.brandOwner?.trim() || undefined;
  const householdServing = food.householdServingFullText?.trim() || undefined;
  return {
    fdcId: String(food.fdcId),
    description: food.description ?? "",
    ...(brand ? { brand } : {}),
    calories: perServing(1008),
    protein: perServing(1003),
    carbs: perServing(1005),
    fat: perServing(1004),
    servingSize,
    servingUnit: servingUnit ?? "g",
    ...(householdServing ? { householdServing } : {}),
  };
}

/**
 * Proxies the USDA FoodData Central search. Signed-in only: the deployment's
 * key should not be usable by anyone who finds the URL. `reason` lets the UI
 * explain an unavailable search instead of showing an empty list. The POST
 * form is used because the GET form answers 400 to some orderings of the
 * `dataType` list.
 */
export async function searchFoods(query: string): Promise<Response> {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    return json(
      { error: "Food search isn't set up on this deployment. Add a food manually with Custom.", reason: "not_configured" },
      503
    );
  }
  if (query.trim().length === 0) return json({ foods: [] });

  let response: Response;
  try {
    response = await fetch(`${USDA_SEARCH_URL}?api_key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: query.trim(), dataType: USDA_DATA_TYPES, pageSize: USDA_PAGE_SIZE }),
    });
  } catch {
    return json({ error: "Couldn't reach the food database. Try again shortly.", reason: "unreachable" }, 502);
  }

  if (!response.ok) {
    const badKey = response.status === 403 || response.status === 401;
    return json(
      {
        error: badKey ? "The food database rejected our key. Check USDA_API_KEY." : "The food database is having trouble. Try again shortly.",
        reason: badKey ? "bad_key" : "upstream_error",
      },
      502
    );
  }

  const data = (await response.json()) as { foods?: UsdaFood[] };
  return json({ foods: (data.foods ?? []).map(toFoodSearchResult) });
}

// --- handlers ---------------------------------------------------------------

function dayParam(request: Request, name: string, required = false): Date | undefined {
  const raw = new URL(request.url).searchParams.get(name);
  if (raw === null || raw === "") {
    if (required) throw new HttpError(fail(422, "Validation failed", { [name]: ["Required"] }));
    return undefined;
  }
  const parsed = calendarDay.safeParse(raw);
  if (!parsed.success) throw new HttpError(fail(422, "Validation failed", { [name]: ["Must be YYYY-MM-DD"] }));
  return parseDate(parsed.data);
}

export const log = {
  GET: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      return json(await readDay(userId, dayParam(request, "date") ?? new Date()));
    })) satisfies ApiHandler,

  POST: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      const input = await readJson(request, logFoodSchema);
      return json({ item: await logFood(userId, input) }, 201);
    })) satisfies ApiHandler,
};

export const logItem = {
  DELETE: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      await removeFoodItem(userId, params.id);
      return noContent();
    })) satisfies ApiHandler,
};

export const totals = {
  GET: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      const from = dayParam(request, "from", true)!;
      const to = dayParam(request, "to", true)!;
      if (to < from) throw new HttpError(fail(422, "Validation failed", { to: ["Must not be before from"] }));
      const end = dayBounds(to).end;
      return json({ days: await dailyTotals(userId, from, end) });
    })) satisfies ApiHandler,
};

export const custom = {
  GET: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      return json({ customFoods: await listCustomFoods(userId) });
    })) satisfies ApiHandler,
  POST: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      const input = await readJson(request, createCustomFoodSchema);
      return json({ customFood: await createCustomFood(userId, input) }, 201);
    })) satisfies ApiHandler,
};

export const customItem = {
  DELETE: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      await deleteCustomFood(userId, params.id);
      return noContent();
    })) satisfies ApiHandler,
};

export const favorites = {
  GET: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      return json({ favorites: await listFavoriteFoods(userId) });
    })) satisfies ApiHandler,
  POST: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      const input = await readJson(request, createFavoriteFoodSchema);
      return json({ favorite: await createFavoriteFood(userId, input) }, 201);
    })) satisfies ApiHandler,
};

export const favoriteItem = {
  DELETE: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      await deleteFavoriteFood(userId, params.id);
      return noContent();
    })) satisfies ApiHandler,
};

export const meals = {
  GET: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      return json({ meals: await listFavoriteMeals(userId) });
    })) satisfies ApiHandler,
  POST: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      const input = await readJson(request, saveMealSchema);
      return json({ meal: await saveMeal(userId, input) }, 201);
    })) satisfies ApiHandler,
};

export const mealItem = {
  DELETE: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      await deleteFavoriteMeal(userId, params.id);
      return noContent();
    })) satisfies ApiHandler,
};

export const mealLog = {
  POST: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      const input = await readJson(request, logMealSchema);
      return json({ items: await logMeal(userId, params.id, input) }, 201);
    })) satisfies ApiHandler,
};

export const search = {
  GET: (({ request }) =>
    handler(async () => {
      await requireSession(request);
      return searchFoods(new URL(request.url).searchParams.get("q") ?? "");
    })) satisfies ApiHandler,
};
