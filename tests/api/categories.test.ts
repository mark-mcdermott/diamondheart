import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { trackerMetrics, userNavItems, type TrackerCategory } from "@/db/schema";
import * as categories from "@/server/api/categories";
import * as metrics from "@/server/api/metrics";
import * as nav from "@/server/api/nav";
import { call, createUser, deleteUser, type TestUser } from "./support";

type One = { category: TrackerCategory };
type Many = { categories: TrackerCategory[] };
type Failure = { error: string; fields?: Record<string, string[]> };

const PATH = "/api/categories";

describe("categories", () => {
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
    expect((await call(categories.GET, PATH)).status).toBe(401);
    expect((await call(categories.POST, PATH, { method: "POST", body: { name: "x" } })).status).toBe(401);
  });

  it("creates with a slug, refuses a duplicate, and lists in order", async () => {
    const created = await call(categories.POST, PATH, { method: "POST", as: user, body: { name: "Body Comp" } });
    expect(created.status).toBe(201);
    expect((created.json as One).category).toMatchObject({ name: "Body Comp", slug: "body-comp", userId: user.id });

    const dup = await call(categories.POST, PATH, { method: "POST", as: user, body: { name: "body comp" } });
    expect(dup.status).toBe(409);

    const empty = await call(categories.POST, PATH, { method: "POST", as: user, body: { name: "   " } });
    expect(empty.status).toBe(422);
    expect(Object.keys((empty.json as Failure).fields ?? {})).toEqual(["name"]);

    const list = await call(categories.GET, PATH, { as: user });
    expect((list.json as Many).categories.map((c) => c.slug)).toEqual(["body-comp"]);
  });

  it("renames the category and the nav item that points at it", async () => {
    const { category } = (await call(categories.POST, PATH, { method: "POST", as: user, body: { name: "Mood" } })).json as One;
    await nav.setCategoryInNav(user.id, category.id, true);

    const renamed = await call(categories.item.PATCH, `${PATH}/x`, {
      method: "PATCH",
      as: user,
      params: { id: category.id },
      body: { name: "Feelings" },
    });
    expect(renamed.status).toBe(200);
    expect((renamed.json as One).category).toMatchObject({ name: "Feelings", slug: "feelings" });

    const [item] = await db
      .select()
      .from(userNavItems)
      .where(and(eq(userNavItems.userId, user.id), eq(userNavItems.referenceId, category.id)));
    expect(item).toMatchObject({ label: "Feelings", href: "/metrics#feelings" });
  });

  it("someone else's category is a 404 to rename or delete", async () => {
    const { category } = (await call(categories.POST, PATH, { method: "POST", as: other, body: { name: "Theirs" } })).json as One;
    const rename = await call(categories.item.PATCH, `${PATH}/x`, {
      method: "PATCH",
      as: user,
      params: { id: category.id },
      body: { name: "Mine now" },
    });
    expect(rename.status).toBe(404);
    const del = await call(categories.item.DELETE, `${PATH}/x`, { method: "DELETE", as: user, params: { id: category.id } });
    expect(del.status).toBe(404);
  });

  it("deleting moves its metrics to the default category and drops its nav item", async () => {
    const { category } = (await call(categories.POST, PATH, { method: "POST", as: user, body: { name: "Temp" } })).json as One;
    const metric = await metrics.createMetric(user.id, { name: "Steps", valueType: "number", categoryId: category.id });
    await nav.setCategoryInNav(user.id, category.id, true);

    const res = await call(categories.item.DELETE, `${PATH}/x`, { method: "DELETE", as: user, params: { id: category.id } });
    expect(res.status).toBe(204);

    const [moved] = await db.select().from(trackerMetrics).where(eq(trackerMetrics.id, metric.id));
    const fallback = await categories.ensureDefaultCategory(user.id);
    expect(moved.categoryId).toBe(fallback.id);
    expect(fallback).toMatchObject({ name: "General", slug: "default" });

    const items = await db
      .select()
      .from(userNavItems)
      .where(and(eq(userNavItems.userId, user.id), eq(userNavItems.referenceId, category.id)));
    expect(items).toHaveLength(0);
  });

  it("refuses to delete the default category", async () => {
    const fallback = await categories.ensureDefaultCategory(user.id);
    const res = await call(categories.item.DELETE, `${PATH}/x`, { method: "DELETE", as: user, params: { id: fallback.id } });
    expect(res.status).toBe(409);
  });
});
