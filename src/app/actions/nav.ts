"use server";

import { db } from "@/db";
import { userNavItems, trackerCategories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { DEFAULT_NAV_ITEMS, buildDefaultNavItems, hasDuplicates } from "@/lib/nav-utils";

export type ActionResult = {
  success: boolean;
  error?: string;
};

/**
 * READ-ONLY: Get nav items for a user.
 * Never writes to the DB — returns in-memory defaults if no items exist or if
 * duplicates are found. This eliminates the race condition where concurrent
 * requests each try to auto-seed and create duplicate rows.
 */
export async function getNavItems(userId: string) {
  const items = await db
    .select()
    .from(userNavItems)
    .where(eq(userNavItems.userId, userId))
    .orderBy(userNavItems.sortOrder);

  // No items → return virtual defaults (no DB write = no race)
  if (items.length === 0) {
    return buildDefaultNavItems(userId);
  }

  // Duplicates exist → clean them up, return virtual defaults
  if (hasDuplicates(items)) {
    await db.delete(userNavItems).where(eq(userNavItems.userId, userId));
    return buildDefaultNavItems(userId);
  }

  return items;
}

/**
 * Ensure nav items are persisted in the DB for a user.
 * Called before mutations (toggle, reorder) to materialize virtual defaults.
 * Returns the persisted items.
 */
async function ensureNavItemsPersisted(userId: string) {
  const items = await db
    .select()
    .from(userNavItems)
    .where(eq(userNavItems.userId, userId))
    .orderBy(userNavItems.sortOrder);

  // Clean up dupes if they exist
  if (items.length > 0 && hasDuplicates(items)) {
    await db.delete(userNavItems).where(eq(userNavItems.userId, userId));
    // Fall through to seed below
  } else if (items.length > 0) {
    return items;
  }

  // Seed defaults
  for (const item of DEFAULT_NAV_ITEMS) {
    await db.insert(userNavItems).values({
      id: crypto.randomUUID(),
      userId,
      label: item.label,
      href: item.href,
      itemType: item.itemType,
      sortOrder: item.sortOrder,
      visible: item.visible,
      locked: item.locked,
    });
  }

  return db
    .select()
    .from(userNavItems)
    .where(eq(userNavItems.userId, userId))
    .orderBy(userNavItems.sortOrder);
}

export async function toggleNavItemVisibility(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const itemId = formData.get("itemId") as string;
  if (!itemId) return { success: false, error: "Item ID is required" };

  // Ensure items are persisted before mutating
  const allItems = await ensureNavItemsPersisted(session.userId);

  const item = allItems.find(i => i.id === itemId);
  if (!item) return { success: false, error: "Item not found" };
  if (item.locked) return { success: false, error: "Cannot toggle locked item" };

  const newVisible = !item.visible;

  // Separate into checked and unchecked
  const checked = allItems.filter(i => i.id === itemId ? newVisible : i.visible);
  const unchecked = allItems.filter(i => i.id === itemId ? !newVisible : !i.visible);

  const reordered = [...checked, ...unchecked];

  for (let i = 0; i < reordered.length; i++) {
    await db
      .update(userNavItems)
      .set({
        sortOrder: i,
        visible: reordered[i].id === itemId ? newVisible : reordered[i].visible,
        updatedAt: new Date(),
      })
      .where(eq(userNavItems.id, reordered[i].id));
  }

  revalidatePath("/settings");
  revalidatePath("/metrics");
  return { success: true };
}

export async function reorderNavItems(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const idsJson = formData.get("ids") as string;
  if (!idsJson) return { success: false, error: "IDs are required" };

  let ids: string[];
  try {
    ids = JSON.parse(idsJson);
  } catch {
    return { success: false, error: "Invalid IDs" };
  }

  // Ensure items are persisted before mutating
  await ensureNavItemsPersisted(session.userId);

  for (let i = 0; i < ids.length; i++) {
    await db
      .update(userNavItems)
      .set({ sortOrder: i, updatedAt: new Date() })
      .where(and(eq(userNavItems.id, ids[i]), eq(userNavItems.userId, session.userId)));
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function toggleCategoryInNav(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const categoryId = formData.get("categoryId") as string;
  if (!categoryId) return { success: false, error: "Category ID is required" };

  // Ensure items are persisted before mutating
  await ensureNavItemsPersisted(session.userId);

  // Check if a nav item already exists for this category
  const [existing] = await db
    .select()
    .from(userNavItems)
    .where(and(
      eq(userNavItems.userId, session.userId),
      eq(userNavItems.referenceId, categoryId),
      eq(userNavItems.itemType, "metric_category")
    ))
    .limit(1);

  if (existing) {
    const fd = new FormData();
    fd.set("itemId", existing.id);
    return toggleNavItemVisibility(fd);
  } else {
    const [category] = await db
      .select()
      .from(trackerCategories)
      .where(eq(trackerCategories.id, categoryId))
      .limit(1);

    if (!category) return { success: false, error: "Category not found" };

    const allItems = await db
      .select()
      .from(userNavItems)
      .where(eq(userNavItems.userId, session.userId))
      .orderBy(userNavItems.sortOrder);

    const lastVisibleIndex = allItems.reduce(
      (max, item, idx) => (item.visible ? idx : max),
      -1
    );

    const insertAt = lastVisibleIndex + 1;

    for (let i = allItems.length - 1; i >= insertAt; i--) {
      await db
        .update(userNavItems)
        .set({ sortOrder: i + 1, updatedAt: new Date() })
        .where(eq(userNavItems.id, allItems[i].id));
    }

    await db.insert(userNavItems).values({
      id: crypto.randomUUID(),
      userId: session.userId,
      label: category.name,
      href: `/metrics#${category.slug}`,
      itemType: "metric_category",
      referenceId: categoryId,
      sortOrder: insertAt,
      visible: true,
      locked: false,
    });
  }

  revalidatePath("/settings");
  revalidatePath("/metrics");
  return { success: true };
}

export async function getCategoryNavStatus(userId: string, categoryIds: string[]) {
  if (categoryIds.length === 0) return {};

  const items = await db
    .select()
    .from(userNavItems)
    .where(and(
      eq(userNavItems.userId, userId),
      eq(userNavItems.itemType, "metric_category")
    ));

  const status: Record<string, boolean> = {};
  for (const id of categoryIds) {
    const item = items.find(i => i.referenceId === id);
    status[id] = item ? item.visible : false;
  }
  return status;
}
