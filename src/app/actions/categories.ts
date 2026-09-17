"use server";

import { db } from "@/db";
import { trackerCategories, trackerMetrics, userNavItems } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type ActionResult = {
  success: boolean;
  error?: string;
};

export async function createCategory(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const name = formData.get("name") as string;
  if (!name?.trim()) return { success: false, error: "Name is required" };

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const [existing] = await db
    .select()
    .from(trackerCategories)
    .where(
      and(
        eq(trackerCategories.slug, slug),
        eq(trackerCategories.userId, session.userId)
      )
    )
    .limit(1);

  if (existing) return { success: false, error: "Category already exists" };

  const [maxSort] = await db
    .select({ max: sql<string>`COALESCE(MAX(${trackerCategories.sortOrder}), '-1')` })
    .from(trackerCategories)
    .where(eq(trackerCategories.userId, session.userId));
  const nextSort = String(parseInt(maxSort?.max ?? "-1", 10) + 1);

  await db.insert(trackerCategories).values({
    id: crypto.randomUUID(),
    userId: session.userId,
    name: name.trim(),
    slug,
    sortOrder: nextSort,
  });

  revalidatePath("/metrics");
  return { success: true };
}

export async function renameCategory(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const categoryId = formData.get("categoryId") as string;
  const name = formData.get("name") as string;
  if (!categoryId || !name?.trim()) return { success: false, error: "Category and name are required" };

  const newSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const renamed = await db
    .update(trackerCategories)
    .set({ name: name.trim(), slug: newSlug })
    .where(
      and(
        eq(trackerCategories.id, categoryId),
        eq(trackerCategories.userId, session.userId)
      )
    )
    .returning({ id: trackerCategories.id });

  if (!renamed.length) return { success: false, error: "Category not found" };

  // Update label on any nav items referencing this category
  await db
    .update(userNavItems)
    .set({ label: name.trim(), updatedAt: new Date() })
    .where(and(
      eq(userNavItems.userId, session.userId),
      eq(userNavItems.referenceId, categoryId),
      eq(userNavItems.itemType, "metric_category")
    ));

  revalidatePath("/metrics");
  revalidatePath("/settings");
  return { success: true };
}

export async function deleteCategory(formData: FormData): Promise<ActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const categoryId = formData.get("categoryId") as string;
  if (!categoryId) return { success: false, error: "Category ID is required" };

  const [target] = await db
    .select({ id: trackerCategories.id })
    .from(trackerCategories)
    .where(
      and(
        eq(trackerCategories.id, categoryId),
        eq(trackerCategories.userId, session.userId)
      )
    )
    .limit(1);

  if (!target) return { success: false, error: "Category not found" };

  // Get or create default category to reassign metrics
  let [defaultCat] = await db
    .select()
    .from(trackerCategories)
    .where(
      and(
        eq(trackerCategories.slug, "default"),
        eq(trackerCategories.userId, session.userId)
      )
    )
    .limit(1);

  if (!defaultCat) {
    const id = crypto.randomUUID();
    [defaultCat] = await db.insert(trackerCategories).values({
      id,
      userId: session.userId,
      name: "General",
      slug: "default",
      sortOrder: "0",
    }).returning();
  }

  // Don't delete the default category
  if (categoryId === defaultCat.id) {
    return { success: false, error: "Cannot delete the default category" };
  }

  // Reassign metrics to default category
  await db
    .update(trackerMetrics)
    .set({ categoryId: defaultCat.id })
    .where(
      and(
        eq(trackerMetrics.categoryId, categoryId),
        eq(trackerMetrics.userId, session.userId)
      )
    );

  // Remove nav items referencing this category
  await db
    .delete(userNavItems)
    .where(and(
      eq(userNavItems.userId, session.userId),
      eq(userNavItems.referenceId, categoryId),
      eq(userNavItems.itemType, "metric_category")
    ));

  // Delete the category
  await db
    .delete(trackerCategories)
    .where(
      and(
        eq(trackerCategories.id, categoryId),
        eq(trackerCategories.userId, session.userId)
      )
    );

  revalidatePath("/metrics");
  revalidatePath("/settings");
  return { success: true };
}
