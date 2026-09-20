import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { trackerEntries, type TrackerEntry, type TrackerMetric } from "@/db/schema";
import * as metrics from "@/server/api/metrics";
import { call, createUser, deleteUser, type TestUser } from "./support";

type One = { metric: TrackerMetric };
type Many = { metrics: TrackerMetric[] };
type Detail = { metric: TrackerMetric; entries: TrackerEntry[] };
type EntryBody = { entry: TrackerEntry };
type Failure = { error: string; fields?: Record<string, string[]> };

const PATH = "/api/metrics";

describe("metrics", () => {
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

  it("answers 401 without a session", async () => {
    expect((await call(metrics.GET, PATH)).status).toBe(401);
    expect((await call(metrics.POST, PATH, { method: "POST", body: { name: "x", valueType: "number" } })).status).toBe(401);
  });

  it("creates into a General category when none is given", async () => {
    const res = await call(metrics.POST, PATH, { method: "POST", as: user, body: { name: "Coffee", valueType: "number", counter: true } });
    expect(res.status).toBe(201);
    const { metric } = res.json as One;
    expect(metric).toMatchObject({ name: "Coffee", slug: "coffee", dailyGoal: 1, counter: true, singleValuePerDay: false, sortOrder: "0" });
    expect(metric.categoryId).toBeTruthy();

    const list = await call(metrics.GET, PATH, { as: user });
    expect((list.json as Many).metrics.map((m) => m.id)).toEqual([metric.id]);
  });

  it("rejects a category that is not the caller's", async () => {
    const theirs = await metrics.createMetric(other.id, { name: "Theirs", valueType: "number" });
    const res = await call(metrics.POST, PATH, {
      method: "POST",
      as: user,
      body: { name: "Sneaky", valueType: "number", categoryId: theirs.categoryId },
    });
    expect(res.status).toBe(404);
  });

  it("validates the create body", async () => {
    const res = await call(metrics.POST, PATH, { method: "POST", as: user, body: { name: "Bad", valueType: "number", dailyGoal: 0 } });
    expect(res.status).toBe(422);
    expect(Object.keys((res.json as Failure).fields ?? {})).toEqual(["dailyGoal"]);
  });

  it("a single-value metric cannot also be a counter", async () => {
    const created = (await call(metrics.POST, PATH, {
      method: "POST",
      as: user,
      body: { name: "Weight", valueType: "number", unit: "kg", counter: true, singleValuePerDay: true },
    })).json as One;
    expect(created.metric).toMatchObject({ counter: false, singleValuePerDay: true });

    const patched = await call(metrics.item.PATCH, `${PATH}/x`, {
      method: "PATCH",
      as: user,
      params: { id: created.metric.id },
      body: { counter: true },
    });
    expect((patched.json as One).metric.counter).toBe(false);
  });

  it("PATCH is partial and renames the slug with the name", async () => {
    const { metric } = (await call(metrics.POST, PATH, { method: "POST", as: user, body: { name: "Water", valueType: "number", unit: "oz" } })).json as One;
    const res = await call(metrics.item.PATCH, `${PATH}/x`, {
      method: "PATCH",
      as: user,
      params: { id: metric.id },
      body: { name: "Water Intake", hidden: true },
    });
    expect(res.status).toBe(200);
    expect((res.json as One).metric).toMatchObject({ name: "Water Intake", slug: "water-intake", hidden: true, unit: "oz" });

    const foreign = await call(metrics.item.PATCH, `${PATH}/x`, {
      method: "PATCH",
      as: other,
      params: { id: metric.id },
      body: { name: "Mine" },
    });
    expect(foreign.status).toBe(404);
  });

  it("reorders from the array index and rejects an id that is not the caller's", async () => {
    const mine = (await call(metrics.GET, PATH, { as: user })).json as Many;
    const reversed = [...mine.metrics].reverse().map((m) => m.id);
    const res = await call(metrics.PATCH, PATH, { method: "PATCH", as: user, body: { ids: reversed } });
    expect(res.status).toBe(200);
    expect((res.json as Many).metrics.map((m) => m.id)).toEqual(reversed);

    const bad = await call(metrics.PATCH, PATH, { method: "PATCH", as: user, body: { ids: [...reversed, "nope"] } });
    expect(bad.status).toBe(422);
    expect((bad.json as Failure).fields?.ids?.[0]).toContain("nope");
  });

  it("a bare quick-log records 'done'; an accumulating metric keeps every entry", async () => {
    const coffee = (await call(metrics.GET, PATH, { as: user })).json as Many;
    const id = coffee.metrics.find((m) => m.slug === "coffee")!.id;

    const first = await call(metrics.entries.POST, `${PATH}/x/entries`, { method: "POST", as: user, params: { id }, body: {} });
    expect(first.status).toBe(201);
    expect((first.json as EntryBody).entry).toMatchObject({ value: "done", metricId: id, notes: null });

    const second = await call(metrics.entries.POST, `${PATH}/x/entries`, { method: "POST", as: user, params: { id }, body: { value: "2" } });
    expect(second.status).toBe(201);

    const detail = (await call(metrics.item.GET, `${PATH}/x`, { as: user, params: { id } })).json as Detail;
    expect(detail.entries).toHaveLength(2);
  });

  it("a single-value metric replaces the day's entry and converts the caller's unit", async () => {
    const weight = ((await call(metrics.GET, PATH, { as: user })).json as Many).metrics.find((m) => m.slug === "weight")!;
    const date = new Date("2026-09-20T09:00:00.000Z").toISOString();

    const first = await call(metrics.entries.POST, `${PATH}/x/entries`, {
      method: "POST",
      as: user,
      params: { id: weight.id },
      body: { value: "180", unit: "lb", date },
    });
    expect(first.status).toBe(201);
    expect(parseFloat((first.json as EntryBody).entry.value)).toBeCloseTo(81.65, 1);

    const again = await call(metrics.entries.POST, `${PATH}/x/entries`, {
      method: "POST",
      as: user,
      params: { id: weight.id },
      body: { value: "82", date: new Date("2026-09-20T21:00:00.000Z").toISOString() },
    });
    expect(again.status).toBe(200);
    expect((again.json as EntryBody).entry.id).toBe((first.json as EntryBody).entry.id);
    expect((again.json as EntryBody).entry.value).toBe("82");

    const rows = await db.select().from(trackerEntries).where(eq(trackerEntries.metricId, weight.id));
    expect(rows).toHaveLength(1);
  });

  it("updates and deletes an entry, but only the owner's", async () => {
    const coffeeId = ((await call(metrics.GET, PATH, { as: user })).json as Many).metrics.find((m) => m.slug === "coffee")!.id;
    const { entry } = (await call(metrics.entries.POST, `${PATH}/x/entries`, { method: "POST", as: user, params: { id: coffeeId }, body: { value: "3" } })).json as EntryBody;

    const patched = await call(metrics.entry.PATCH, "/api/entries/x", {
      method: "PATCH",
      as: user,
      params: { id: entry.id },
      body: { notes: "double shot" },
    });
    expect(patched.status).toBe(200);
    expect((patched.json as EntryBody).entry).toMatchObject({ value: "3", notes: "double shot" });

    const foreign = await call(metrics.entry.DELETE, "/api/entries/x", { method: "DELETE", as: other, params: { id: entry.id } });
    expect(foreign.status).toBe(404);

    const gone = await call(metrics.entry.DELETE, "/api/entries/x", { method: "DELETE", as: user, params: { id: entry.id } });
    expect(gone.status).toBe(204);
    expect((await call(metrics.entry.DELETE, "/api/entries/x", { method: "DELETE", as: user, params: { id: entry.id } })).status).toBe(404);
  });

  it("deleting a metric takes its entries with it, and a foreign metric is a 404", async () => {
    const coffeeId = ((await call(metrics.GET, PATH, { as: user })).json as Many).metrics.find((m) => m.slug === "coffee")!.id;
    expect((await call(metrics.item.DELETE, `${PATH}/x`, { method: "DELETE", as: other, params: { id: coffeeId } })).status).toBe(404);

    const res = await call(metrics.item.DELETE, `${PATH}/x`, { method: "DELETE", as: user, params: { id: coffeeId } });
    expect(res.status).toBe(204);
    expect(await db.select().from(trackerEntries).where(eq(trackerEntries.metricId, coffeeId))).toHaveLength(0);
    expect((await call(metrics.item.GET, `${PATH}/x`, { as: user, params: { id: coffeeId } })).status).toBe(404);
  });
});
