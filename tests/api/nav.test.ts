import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { trackerCategories, userNavItems, type UserNavItem } from "@/db/schema";
import * as nav from "@/server/api/nav";
import { call, createUser, deleteUser, type TestUser } from "./support";

type Body = { items: UserNavItem[] };
type Failure = { error: string; fields?: Record<string, string[]> };

const PATH = "/api/nav";
const defaultId = (user: TestUser, slug: string) => `default-${user.id.slice(0, 8)}-${slug}`;
const items = (res: { json: unknown }) => (res.json as Body).items;
const hrefs = (list: UserNavItem[]) => list.map((i) => i.href);

async function rowCount(user: TestUser): Promise<number> {
  const rows = await db.select().from(userNavItems).where(eq(userNavItems.userId, user.id));
  return rows.length;
}

describe("nav", () => {
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
    expect((await call(nav.GET, PATH)).status).toBe(401);
    expect((await call(nav.PATCH, PATH, { method: "PATCH", body: { ids: ["x"] } })).status).toBe(401);
  });

  it("gives a fresh account the defaults without writing a row", async () => {
    const res = await call(nav.GET, PATH, { as: user });
    expect(res.status).toBe(200);
    const list = items(res);
    expect(list).toHaveLength(11);
    expect(list[0]).toMatchObject({ href: "/dashboard", locked: true, visible: true });
    expect(list.every((i) => i.id.startsWith("default-"))).toBe(true);
    expect(await rowCount(user)).toBe(0);
  });

  it("the first mutation persists the same ids the client already holds", async () => {
    const res = await call(nav.item.PATCH, `${PATH}/x`, {
      method: "PATCH",
      as: user,
      params: { id: defaultId(user, "food") },
      body: { visible: false },
    });
    expect(res.status).toBe(200);
    const list = items(res);
    expect(await rowCount(user)).toBe(11);
    expect(list.find((i) => i.href === "/food")).toMatchObject({ id: defaultId(user, "food"), visible: false });
    // Visible items are packed first, so Food now sits among the hidden tail.
    const firstHidden = list.findIndex((i) => !i.visible);
    expect(list.slice(firstHidden).every((i) => !i.visible)).toBe(true);
  });

  it("setting the state an item already has is a no-op", async () => {
    const before = hrefs(items(await call(nav.GET, PATH, { as: user })));
    const res = await call(nav.item.PATCH, `${PATH}/x`, {
      method: "PATCH",
      as: user,
      params: { id: defaultId(user, "food") },
      body: { visible: false },
    });
    expect(res.status).toBe(200);
    expect(hrefs(items(res))).toEqual(before);
  });

  it("refuses to hide the locked Dashboard item, but showing it is fine", async () => {
    const hide = await call(nav.item.PATCH, `${PATH}/x`, {
      method: "PATCH",
      as: user,
      params: { id: defaultId(user, "dashboard") },
      body: { visible: false },
    });
    expect(hide.status).toBe(422);
    expect(Object.keys((hide.json as Failure).fields ?? {})).toEqual(["visible"]);

    const show = await call(nav.item.PATCH, `${PATH}/x`, {
      method: "PATCH",
      as: user,
      params: { id: defaultId(user, "dashboard") },
      body: { visible: true },
    });
    expect(show.status).toBe(200);
  });

  it("reorders from the array index", async () => {
    const current = items(await call(nav.GET, PATH, { as: user }));
    const reversed = [...current].reverse().map((i) => i.id);
    const res = await call(nav.PATCH, PATH, { method: "PATCH", as: user, body: { ids: reversed } });
    expect(res.status).toBe(200);
    expect(items(res).map((i) => i.id)).toEqual(reversed);
  });

  it("rejects a reorder naming an id that is not the caller's", async () => {
    const mine = items(await call(nav.GET, PATH, { as: user })).map((i) => i.id);
    const res = await call(nav.PATCH, PATH, {
      method: "PATCH",
      as: user,
      body: { ids: [...mine, "not-mine"] },
    });
    expect(res.status).toBe(422);
    expect((res.json as Failure).fields?.ids?.[0]).toContain("not-mine");

    // Another user's real id is equally unknown to this caller.
    await call(nav.item.PATCH, `${PATH}/x`, {
      method: "PATCH",
      as: other,
      params: { id: defaultId(other, "food") },
      body: { visible: false },
    });
    const foreign = await call(nav.PATCH, PATH, {
      method: "PATCH",
      as: user,
      body: { ids: [defaultId(other, "food")] },
    });
    expect(foreign.status).toBe(422);
  });

  it("someone else's item is a 404 on the item route", async () => {
    const res = await call(nav.item.PATCH, `${PATH}/x`, {
      method: "PATCH",
      as: user,
      params: { id: defaultId(other, "food") },
      body: { visible: true },
    });
    expect(res.status).toBe(404);
  });

  it("addresses a tracking section by key", async () => {
    const res = await call(nav.section.PUT, `${PATH}/sections/food`, {
      method: "PUT",
      as: user,
      params: { key: "food" },
      body: { visible: true },
    });
    expect(res.status).toBe(200);
    const list = items(res);
    const food = list.find((i) => i.href === "/food");
    expect(food?.visible).toBe(true);
    const lastVisible = list.reduce((max, i, idx) => (i.visible ? idx : max), -1);
    expect(list.indexOf(food!)).toBeLessThanOrEqual(lastVisible);

    const unknown = await call(nav.section.PUT, `${PATH}/sections/nope`, {
      method: "PUT",
      as: user,
      params: { key: "nope" },
      body: { visible: true },
    });
    expect(unknown.status).toBe(404);
  });

  it("creates a category's nav item on first show, and only for the owner", async () => {
    const categoryId = crypto.randomUUID();
    await db.insert(trackerCategories).values({ id: categoryId, userId: user.id, name: "Body", slug: "body" });

    const hidden = await call(nav.category.PUT, `${PATH}/categories/x`, {
      method: "PUT",
      as: user,
      params: { categoryId },
      body: { visible: false },
    });
    expect(hidden.status).toBe(200);
    expect(items(hidden).some((i) => i.referenceId === categoryId)).toBe(false);

    const shown = await call(nav.category.PUT, `${PATH}/categories/x`, {
      method: "PUT",
      as: user,
      params: { categoryId },
      body: { visible: true },
    });
    expect(shown.status).toBe(200);
    const list = items(shown);
    const entry = list.find((i) => i.referenceId === categoryId);
    expect(entry).toMatchObject({ itemType: "metric_category", href: "/metrics#body", label: "Body", visible: true });
    const lastVisible = list.reduce((max, i, idx) => (i.visible ? idx : max), -1);
    expect(list.indexOf(entry!)).toBe(lastVisible);

    const foreign = await call(nav.category.PUT, `${PATH}/categories/x`, {
      method: "PUT",
      as: other,
      params: { categoryId },
      body: { visible: true },
    });
    expect(foreign.status).toBe(404);

    const rehidden = await call(nav.category.PUT, `${PATH}/categories/x`, {
      method: "PUT",
      as: user,
      params: { categoryId },
      body: { visible: false },
    });
    expect(items(rehidden).find((i) => i.referenceId === categoryId)?.visible).toBe(false);

    const rows = await db
      .select()
      .from(userNavItems)
      .where(and(eq(userNavItems.userId, user.id), eq(userNavItems.referenceId, categoryId)));
    expect(rows).toHaveLength(1);
  });

  it("one user's nav never shows another's changes", async () => {
    const theirs = items(await call(nav.GET, PATH, { as: other }));
    expect(theirs.some((i) => i.itemType === "metric_category")).toBe(false);
    expect(theirs.find((i) => i.href === "/food")?.visible).toBe(false);
  });
});
