import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as food from "@/server/api/food";
import { call, createUser, deleteUser, type TestUser } from "./support";

type Day = food.FoodDay;
type ItemBody = { item: food.FoodLogItem };
type Failure = { error: string; fields?: Record<string, string[]> };

const DAY = "2026-09-20";
const NEXT = "2026-09-21";

describe("food", () => {
  let user: TestUser;
  let other: TestUser;

  beforeAll(async () => {
    user = await createUser();
    other = await createUser();
  });

  afterAll(async () => {
    await deleteUser(user);
    await deleteUser(other);
  });

  it("answers 401 without a session, including search", async () => {
    expect((await call(food.log.GET, "/api/food/log")).status).toBe(401);
    expect((await call(food.search.GET, "/api/food/search?q=egg")).status).toBe(401);
  });

  it("logs a food into a meal and the day reads it back with quantity-aware totals", async () => {
    const res = await call(food.log.POST, "/api/food/log", {
      method: "POST",
      as: user,
      body: { date: DAY, mealType: "breakfast", name: "Oats", calories: 150, protein: 5, carbs: 27, fat: 3, quantity: 2 },
    });
    expect(res.status).toBe(201);
    expect((res.json as ItemBody).item).toMatchObject({ name: "Oats", quantity: 2, servingSize: 100, servingUnit: "g" });

    const day = (await call(food.log.GET, `/api/food/log?date=${DAY}`, { as: user })).json as Day;
    expect(day.date).toBe(DAY);
    expect(day.meals.breakfast.map((i) => i.name)).toEqual(["Oats"]);
    expect(day.meals.lunch).toEqual([]);
    expect(day.totals).toEqual({ calories: 300, protein: 10, carbs: 54, fat: 6 });

    const tomorrow = (await call(food.log.GET, `/api/food/log?date=${NEXT}`, { as: user })).json as Day;
    expect(tomorrow.totals.calories).toBe(0);
  });

  it("validates the meal type, the macros and the date", async () => {
    const meal = await call(food.log.POST, "/api/food/log", { method: "POST", as: user, body: { mealType: "brunch", name: "x" } });
    expect(meal.status).toBe(422);
    expect(Object.keys((meal.json as Failure).fields ?? {})).toEqual(["mealType"]);

    const negative = await call(food.log.POST, "/api/food/log", { method: "POST", as: user, body: { mealType: "lunch", name: "x", calories: -1 } });
    expect(negative.status).toBe(422);

    const date = await call(food.log.GET, "/api/food/log?date=20-09-2026", { as: user });
    expect(date.status).toBe(422);
  });

  it("removes an item only through its owner's log", async () => {
    const { item } = (await call(food.log.POST, "/api/food/log", { method: "POST", as: user, body: { date: DAY, mealType: "snack", name: "Apple", calories: 95 } })).json as ItemBody;
    expect((await call(food.logItem.DELETE, "/api/food/log/items/x", { method: "DELETE", as: other, params: { id: item.id } })).status).toBe(404);
    expect((await call(food.logItem.DELETE, "/api/food/log/items/x", { method: "DELETE", as: user, params: { id: item.id } })).status).toBe(204);
    const day = (await call(food.log.GET, `/api/food/log?date=${DAY}`, { as: user })).json as Day;
    expect(day.meals.snack).toEqual([]);
  });

  it("sums per day across a range and rejects a backwards range", async () => {
    await call(food.log.POST, "/api/food/log", { method: "POST", as: user, body: { date: NEXT, mealType: "dinner", name: "Rice", calories: 200 } });
    const res = await call(food.totals.GET, `/api/food/totals?from=${DAY}&to=${NEXT}`, { as: user });
    expect(res.status).toBe(200);
    const { days } = res.json as { days: { date: string; calories: number }[] };
    expect(days.map((d) => [d.date, d.calories])).toEqual([[DAY, 300], [NEXT, 200]]);

    expect((await call(food.totals.GET, `/api/food/totals?from=${NEXT}&to=${DAY}`, { as: user })).status).toBe(422);
    expect((await call(food.totals.GET, `/api/food/totals?from=${DAY}`, { as: user })).status).toBe(422);
  });

  it("custom foods and favourites are per user", async () => {
    const custom = await call(food.custom.POST, "/api/food/custom", { method: "POST", as: user, body: { name: "My bar", calories: 210, protein: 20 } });
    expect(custom.status).toBe(201);
    const customId = (custom.json as { customFood: food.CustomFood }).customFood.id;

    const fav = await call(food.favorites.POST, "/api/food/favorites", { method: "POST", as: user, body: { name: "My bar", customFoodId: customId, calories: 210 } });
    expect(fav.status).toBe(201);

    const foreignFav = await call(food.favorites.POST, "/api/food/favorites", { method: "POST", as: other, body: { name: "Not mine", customFoodId: customId } });
    expect(foreignFav.status).toBe(404);

    expect(((await call(food.favorites.GET, "/api/food/favorites", { as: other })).json as { favorites: unknown[] }).favorites).toEqual([]);
    expect(((await call(food.custom.GET, "/api/food/custom", { as: user })).json as { customFoods: unknown[] }).customFoods).toHaveLength(1);

    const favId = (fav.json as { favorite: food.FavoriteFood }).favorite.id;
    expect((await call(food.favoriteItem.DELETE, "/api/food/favorites/x", { method: "DELETE", as: other, params: { id: favId } })).status).toBe(404);
    expect((await call(food.favoriteItem.DELETE, "/api/food/favorites/x", { method: "DELETE", as: user, params: { id: favId } })).status).toBe(204);
    expect((await call(food.customItem.DELETE, "/api/food/custom/x", { method: "DELETE", as: user, params: { id: customId } })).status).toBe(204);
  });

  it("saves a day's meal as a favourite and logs it onto another day", async () => {
    const empty = await call(food.meals.POST, "/api/food/meals", { method: "POST", as: user, body: { name: "Nothing", mealType: "lunch", date: DAY } });
    expect(empty.status).toBe(422);

    const saved = await call(food.meals.POST, "/api/food/meals", { method: "POST", as: user, body: { name: "Usual breakfast", mealType: "breakfast", date: DAY } });
    expect(saved.status).toBe(201);
    const meal = (saved.json as { meal: food.FavoriteMeal }).meal;
    expect(meal.items.map((i) => i.name)).toEqual(["Oats"]);

    const logged = await call(food.mealLog.POST, "/api/food/meals/x/log", { method: "POST", as: user, params: { id: meal.id }, body: { mealType: "breakfast", date: NEXT } });
    expect(logged.status).toBe(201);
    const day = (await call(food.log.GET, `/api/food/log?date=${NEXT}`, { as: user })).json as Day;
    expect(day.meals.breakfast.map((i) => i.name)).toEqual(["Oats"]);
    expect(day.totals.calories).toBe(500);

    expect((await call(food.mealLog.POST, "/api/food/meals/x/log", { method: "POST", as: other, params: { id: meal.id }, body: { mealType: "lunch" } })).status).toBe(404);
    expect((await call(food.mealItem.DELETE, "/api/food/meals/x", { method: "DELETE", as: other, params: { id: meal.id } })).status).toBe(404);
    expect((await call(food.mealItem.DELETE, "/api/food/meals/x", { method: "DELETE", as: user, params: { id: meal.id } })).status).toBe(204);
  });

  it("search explains a missing key with a 503 instead of failing", async () => {
    const saved = process.env.USDA_API_KEY;
    delete process.env.USDA_API_KEY;
    try {
      const res = await call(food.search.GET, "/api/food/search?q=egg", { as: user });
      expect(res.status).toBe(503);
      expect((res.json as { reason: string }).reason).toBe("not_configured");
    } finally {
      if (saved !== undefined) process.env.USDA_API_KEY = saved;
    }
  });
});
