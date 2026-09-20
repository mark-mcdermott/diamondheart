import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as dashboard from "@/server/api/dashboard";
import * as food from "@/server/api/food";
import * as metrics from "@/server/api/metrics";
import { call, createUser, deleteUser, type TestUser } from "./support";

type Body = dashboard.Dashboard;
const DAY = "2026-09-20";

describe("dashboard", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await createUser();
  });

  afterAll(async () => {
    await deleteUser(user);
  });

  it("answers 401 without a session and 422 for a bad date", async () => {
    expect((await call(dashboard.GET, "/api/dashboard")).status).toBe(401);
    expect((await call(dashboard.GET, "/api/dashboard?date=nope", { as: user })).status).toBe(422);
  });

  it("gathers the day's metrics, entries, sparklines and food in one read", async () => {
    const coffee = await metrics.createMetric(user.id, { name: "Coffee", valueType: "number", counter: true });
    const hidden = await metrics.createMetric(user.id, { name: "Secret", valueType: "number" });
    await metrics.updateMetric(user.id, hidden.id, { hidden: true });

    const at = (time: string) => new Date(`${DAY}T${time}:00`);
    await metrics.createEntry(user.id, coffee.id, { value: "2", date: at("08:00") });
    await metrics.createEntry(user.id, coffee.id, { value: "1", date: at("14:00") });
    const yesterday = new Date(at("09:00"));
    yesterday.setDate(yesterday.getDate() - 1);
    await metrics.createEntry(user.id, coffee.id, { value: "done", date: yesterday });
    await food.logFood(user.id, { date: DAY, mealType: "lunch", name: "Soup", calories: 120, quantity: 2 });

    const res = await call(dashboard.GET, `/api/dashboard?date=${DAY}`, { as: user });
    expect(res.status).toBe(200);
    const body = res.json as Body;

    expect(body.date).toBe(DAY);
    expect(body.metrics.map((m) => m.name)).toEqual(["Coffee"]);
    expect(body.todayEntries.map((e) => e.value).sort()).toEqual(["1", "2"]);
    expect(body.recentEntries).toHaveLength(3);
    expect(body.recentEntries[0].value).toBe("1");

    const spark = body.sparklines[coffee.id];
    expect(spark.map((p) => p.value)).toEqual([1, 3]);

    expect(body.food.totals.calories).toBe(240);
    expect(body.food.meals.lunch).toEqual({ count: 1, calories: 240 });
    expect(body.food.meals.breakfast).toEqual({ count: 0, calories: 0 });
  });
});
