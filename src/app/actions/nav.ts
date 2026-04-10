"use server";

import { db } from "@/db";
import { userNavItems, trackerCategories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hasDuplicates } from "@/lib/nav-utils";

export type ActionResult = {
  success: boolean;
  error?: string;
};

// Default nav items to seed for new users
const DEFAULT_NAV_ITEMS = [
  { label: "Dashboard",     href: "/dashboard",      itemType: "builtin", sortOrder: 0, visible: true,  locked: true },
  { label: "Meditate",      href: "/meditate",       itemType: "builtin", sortOrder: 1, visible: true,  locked: false },
  { label: "Food",          href: "/food",           itemType: "builtin", sortOrder: 2, visible: true,  locked: false },
  { label: "Tracking",      href: "/tracking",       itemType: "builtin", sortOrder: 3, visible: true,  locked: false },
  { label: "Medical",       href: "/medical",        itemType: "builtin", sortOrder: 4, visible: true,  locked: false },
  { label: "Entertainment", href: "/entertainment",  itemType: "builtin", sortOrder: 5, visible: true,  locked: false },
];

async function seedNavItems(userId: string) {
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
}

export async function getNavItems(userId: string) {
  let items = await db
    .select()
    .from(userNavItems)
    .where(eq(userNavItems.userId, userId))
    .orderBy(userNavItems.sortOrder);

  // If duplicates exist (from race condition), nuke and reseed
  if (hasDuplicates(items)) {
    await db
      .delete(userNavItems)
      .where(eq(userNavItems.userId, userId));
    await seedNavItems(userId);
    items = await db
      .select()
      .from(userNavItems)
      .where(eq(userNavItems.userId, userId))
      .orderBy(userNavItems.sortOrder);
    return items;
  }

  // Auto-seed if no nav items exist yet
  if (items.length === 0) {
    await seedNavItems(userId);
    items = await db
      .select()
      .from(userNavItems)
      .where(eq(userNavItems.userId, userId))
      .orderBy(userNavItems.sortOrder);
  }

  return items;
}

export async function toggleNavItemVisibility(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const itemId = formData.get("itemId") as string;
  if (!itemId) return { success: false, error: "Item ID is required" };

  const [item] = await db
    .select()
    .from(userNavItems)
    .where(and(eq(userNavItems.id, itemId), eq(userNavItems.userId, session.userId)))
    .limit(1);

  if (!item) return { success: false, error: "Item not found" };
  if (item.locked) return { success: false, error: "Cannot toggle locked item" };

  const newVisible = !item.visible;

  // Get all items to recompute sort order
  const allItems = await db
    .select()
    .from(userNavItems)
    .where(eq(userNavItems.userId, session.userId))
    .orderBy(userNavItems.sortOrder);

  // Separate into checked and unchecked
  const checked = allItems.filter(i => i.id === itemId ? newVisible : i.visible);
  const unchecked = allItems.filter(i => i.id === itemId ? !newVisible : !i.visible);

  // If toggling ON, put at bottom of checked items. If toggling OFF, put at top of unchecked items.
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
    // Toggle visibility - use the same reorder logic as toggleNavItemVisibility
    const fd = new FormData();
    fd.set("itemId", existing.id);
    return toggleNavItemVisibility(fd);
  } else {
    // Create a new nav item for this category
    const [category] = await db
      .select()
      .from(trackerCategories)
      .where(eq(trackerCategories.id, categoryId))
      .limit(1);

    if (!category) return { success: false, error: "Category not found" };

    // Find the position: after last visible item
    const allItems = await db
      .select()
      .from(userNavItems)
      .where(eq(userNavItems.userId, session.userId))
      .orderBy(userNavItems.sortOrder);

    const lastVisibleIndex = allItems.reduce(
      (max, item, idx) => (item.visible ? idx : max),
      -1
    );

    // Insert after last visible, shift unchecked items down
    const insertAt = lastVisibleIndex + 1;

    // Shift items at and after insertAt
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
