import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { userNavItems, trackerCategories, type UserNavItem } from "@/db/schema";
import {
  DEFAULT_NAV_ITEMS,
  TRACKING_SECTIONS,
  buildDefaultNavItems,
  hasDuplicates,
  needsMigration,
} from "@/lib/nav-utils";
import type { ApiHandler } from "./_lib/context";
import { requireSession } from "./_lib/guard";
import { HttpError, fail, handler, json, notFound, readJson } from "./_lib/http";
import { navVisibilitySchema, reorderSchema } from "./_lib/schemas";

const FEED_HREF = "/feed";

function listRows(userId: string): Promise<UserNavItem[]> {
  return db
    .select()
    .from(userNavItems)
    .where(eq(userNavItems.userId, userId))
    .orderBy(userNavItems.sortOrder);
}

async function ensureCommunityNavItem(
  userId: string,
  items: { id: string; href: string; sortOrder: number }[]
) {
  if (items.some((i) => i.href === FEED_HREF)) return;

  const dashboard = items.find((i) => i.href === "/dashboard");
  const metrics = items.find((i) => i.href === "/metrics");
  const insertAt = Math.max(dashboard?.sortOrder ?? -1, metrics?.sortOrder ?? -1) + 1;

  for (const item of items) {
    if (item.sortOrder >= insertAt) {
      await db
        .update(userNavItems)
        .set({ sortOrder: item.sortOrder + 1, updatedAt: new Date() })
        .where(and(eq(userNavItems.id, item.id), eq(userNavItems.userId, userId)));
    }
  }

  await db.insert(userNavItems).values({
    id: crypto.randomUUID(),
    userId,
    label: "Community",
    href: FEED_HREF,
    itemType: "builtin",
    sortOrder: insertAt,
    visible: true,
    locked: false,
  });
}

/**
 * A user's nav, read-only. Returns in-memory defaults when nothing is stored
 * (or when duplicates are found and cleared), so concurrent first requests
 * cannot race each other into seeding twice.
 */
export async function readNavItems(userId: string): Promise<UserNavItem[]> {
  const items = await listRows(userId);

  if (items.length === 0) return buildDefaultNavItems(userId);

  if (hasDuplicates(items)) {
    await db.delete(userNavItems).where(eq(userNavItems.userId, userId));
    return buildDefaultNavItems(userId);
  }

  if (!items.some((i) => i.href === FEED_HREF)) {
    await ensureCommunityNavItem(userId, items);
    return listRows(userId);
  }

  return items;
}

/**
 * Materialises the defaults before a mutation. The seeded rows keep the
 * deterministic ids `buildDefaultNavItems` hands to the client, so an id the
 * client saw on a fresh account is the id the mutation finds — previously the
 * seed minted random ids and the first reorder or toggle silently matched
 * nothing.
 */
async function ensureNavItemsPersisted(userId: string): Promise<UserNavItem[]> {
  const items = await listRows(userId);

  if (items.length > 0 && hasDuplicates(items)) {
    await db.delete(userNavItems).where(eq(userNavItems.userId, userId));
  } else if (items.length > 0 && needsMigration(items)) {
    const trackingHrefs = TRACKING_SECTIONS.map((s) => s.href);
    for (const item of items) {
      if (item.itemType === "builtin" && trackingHrefs.includes(item.href)) {
        await db
          .update(userNavItems)
          .set({ itemType: "tracking_section", updatedAt: new Date() })
          .where(and(eq(userNavItems.id, item.id), eq(userNavItems.userId, userId)));
      }
    }
    const maxSort = items.reduce((max, i) => Math.max(max, i.sortOrder), 0);
    for (const item of items) {
      if (item.sortOrder >= 1) {
        await db
          .update(userNavItems)
          .set({ sortOrder: item.sortOrder + 1, updatedAt: new Date() })
          .where(and(eq(userNavItems.id, item.id), eq(userNavItems.userId, userId)));
      }
    }
    await db.insert(userNavItems).values({
      id: crypto.randomUUID(),
      userId,
      label: "Metrics",
      href: "/metrics",
      itemType: "builtin",
      sortOrder: 1,
      visible: true,
      locked: false,
    });
    if (!items.some((i) => i.href === "/workout")) {
      await db.insert(userNavItems).values({
        id: crypto.randomUUID(),
        userId,
        label: "Workout",
        href: "/workout",
        itemType: "tracking_section",
        sortOrder: maxSort + 2,
        visible: false,
        locked: false,
      });
    }
    return listRows(userId);
  } else if (items.length > 0) {
    await ensureCommunityNavItem(userId, items);
    return listRows(userId);
  }

  await db.insert(userNavItems).values(buildDefaultNavItems(userId));
  return listRows(userId);
}

/**
 * Sets one item's visibility and re-packs the order: visible items first, in
 * their current order, then hidden ones. Setting the state an item already
 * has is a no-op rather than a reshuffle.
 */
export async function setNavItemVisibility(
  userId: string,
  itemId: string,
  visible: boolean
): Promise<UserNavItem[]> {
  const allItems = await ensureNavItemsPersisted(userId);

  const item = allItems.find((i) => i.id === itemId);
  if (!item) throw new HttpError(notFound("Nav item not found"));
  if (item.visible === visible) return allItems;
  if (item.locked) {
    throw new HttpError(fail(422, "Validation failed", { visible: ["This item cannot be hidden"] }));
  }

  const checked = allItems.filter((i) => (i.id === itemId ? visible : i.visible));
  const unchecked = allItems.filter((i) => (i.id === itemId ? !visible : !i.visible));
  const reordered = [...checked, ...unchecked];

  for (let i = 0; i < reordered.length; i++) {
    await db
      .update(userNavItems)
      .set({
        sortOrder: i,
        visible: reordered[i].id === itemId ? visible : reordered[i].visible,
        updatedAt: new Date(),
      })
      .where(and(eq(userNavItems.id, reordered[i].id), eq(userNavItems.userId, userId)));
  }

  return listRows(userId);
}

/** Rewrites `sortOrder` from the array index. Every id must be one of the caller's. */
export async function reorderNav(userId: string, ids: string[]): Promise<UserNavItem[]> {
  const items = await ensureNavItemsPersisted(userId);

  const known = new Set(items.map((i) => i.id));
  const unknown = ids.filter((id) => !known.has(id));
  if (unknown.length > 0) {
    throw new HttpError(fail(422, "Validation failed", { ids: [`Unknown item: ${unknown[0]}`] }));
  }

  for (let i = 0; i < ids.length; i++) {
    await db
      .update(userNavItems)
      .set({ sortOrder: i, updatedAt: new Date() })
      .where(and(eq(userNavItems.id, ids[i]), eq(userNavItems.userId, userId)));
  }

  return listRows(userId);
}

/**
 * Shows or hides a metric category in the nav, creating its item on first show.
 * The category must be the caller's — a foreign one is a 404.
 */
export async function setCategoryInNav(
  userId: string,
  categoryId: string,
  visible: boolean
): Promise<UserNavItem[]> {
  await ensureNavItemsPersisted(userId);

  const [existing] = await db
    .select()
    .from(userNavItems)
    .where(
      and(
        eq(userNavItems.userId, userId),
        eq(userNavItems.referenceId, categoryId),
        eq(userNavItems.itemType, "metric_category")
      )
    )
    .limit(1);

  if (existing) return setNavItemVisibility(userId, existing.id, visible);

  const [category] = await db
    .select()
    .from(trackerCategories)
    .where(and(eq(trackerCategories.id, categoryId), eq(trackerCategories.userId, userId)))
    .limit(1);
  if (!category) throw new HttpError(notFound("Category not found"));

  // Hiding a category that was never in the nav has nothing to do.
  if (!visible) return listRows(userId);

  const allItems = await listRows(userId);
  const lastVisibleIndex = allItems.reduce((max, item, idx) => (item.visible ? idx : max), -1);
  const insertAt = lastVisibleIndex + 1;

  for (let i = allItems.length - 1; i >= insertAt; i--) {
    await db
      .update(userNavItems)
      .set({ sortOrder: i + 1, updatedAt: new Date() })
      .where(and(eq(userNavItems.id, allItems[i].id), eq(userNavItems.userId, userId)));
  }

  await db.insert(userNavItems).values({
    id: crypto.randomUUID(),
    userId,
    label: category.name,
    href: `/metrics#${category.slug}`,
    itemType: "metric_category",
    referenceId: categoryId,
    sortOrder: insertAt,
    visible: true,
    locked: false,
  });

  return listRows(userId);
}

/** Shows or hides one of the tracking sections, addressed by its key (`food`, `workout`, …). */
export async function setSectionInNav(
  userId: string,
  key: string,
  visible: boolean
): Promise<UserNavItem[]> {
  const section = TRACKING_SECTIONS.find((s) => s.key === key);
  if (!section) throw new HttpError(notFound("Section not found"));

  const allItems = await ensureNavItemsPersisted(userId);
  const item = allItems.find((i) => i.itemType === "tracking_section" && i.href === section.href);
  if (!item) throw new HttpError(notFound("Section not found"));

  return setNavItemVisibility(userId, item.id, visible);
}

export async function trackingSectionStatus(userId: string): Promise<Record<string, boolean>> {
  const items = await readNavItems(userId);
  const status: Record<string, boolean> = {};
  for (const section of TRACKING_SECTIONS) {
    const item = items.find((i) => i.itemType === "tracking_section" && i.href === section.href);
    const fallback = DEFAULT_NAV_ITEMS.find((d) => d.href === section.href);
    status[section.key] = item ? item.visible : (fallback?.visible ?? true);
  }
  return status;
}

export async function categoryNavStatus(
  userId: string,
  categoryIds: string[]
): Promise<Record<string, boolean>> {
  if (categoryIds.length === 0) return {};

  const items = await db
    .select()
    .from(userNavItems)
    .where(and(eq(userNavItems.userId, userId), eq(userNavItems.itemType, "metric_category")));

  const status: Record<string, boolean> = {};
  for (const id of categoryIds) {
    const item = items.find((i) => i.referenceId === id);
    status[id] = item ? item.visible : false;
  }
  return status;
}

export const GET: ApiHandler = ({ request }) =>
  handler(async () => {
    const { userId } = await requireSession(request);
    return json({ items: await readNavItems(userId) });
  });

export const PATCH: ApiHandler = ({ request }) =>
  handler(async () => {
    const { userId } = await requireSession(request);
    const { ids } = await readJson(request, reorderSchema);
    return json({ items: await reorderNav(userId, ids) });
  });

export const item = {
  PATCH: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      const { visible } = await readJson(request, navVisibilitySchema);
      return json({ items: await setNavItemVisibility(userId, params.id, visible) });
    })) satisfies ApiHandler,
};

export const category = {
  PUT: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      const { visible } = await readJson(request, navVisibilitySchema);
      return json({ items: await setCategoryInNav(userId, params.categoryId, visible) });
    })) satisfies ApiHandler,
};

export const section = {
  PUT: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      const { visible } = await readJson(request, navVisibilitySchema);
      return json({ items: await setSectionInNav(userId, params.key, visible) });
    })) satisfies ApiHandler,
};
