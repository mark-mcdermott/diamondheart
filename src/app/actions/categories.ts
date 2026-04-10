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
    .where(eq(trackerCategories.slug, slug))
    .limit(1);

  if (existing) return { success: false, error: "Category already exists" };

  const [maxSort] = await db
    .select({ max: sql<string>`COALESCE(MAX(${trackerCategories.sortOrder}), '-1')` })
    .from(trackerCategories);
  const nextSort = String(parseInt(maxSort?.max ?? "-1", 10) + 1);

  await db.insert(trackerCategories).values({
    id: crypto.randomUUID(),
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

  await db
    .update(trackerCategories)
    .set({ name: name.trim(), slug: newSlug })
    .where(eq(trackerCategories.id, categoryId));

  // Update label on any nav items referencing this category
  await db
    .update(userNavItems)
    .set({ label: name.trim(), updatedAt: new Date() })
    .where(and(
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

  // Get or create default category to reassign metrics
  let [defaultCat] = await db
    .select()
    .from(trackerCategories)
    .where(eq(trackerCategories.slug, "default"))
    .limit(1);

  if (!defaultCat) {
    const id = crypto.randomUUID();
    [defaultCat] = await db.insert(trackerCategories).values({
      id,
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
    .where(eq(trackerMetrics.categoryId, categoryId));

  // Remove nav items referencing this category
  await db
    .delete(userNavItems)
    .where(and(
      eq(userNavItems.referenceId, categoryId),
      eq(userNavItems.itemType, "metric_category")
    ));

  // Delete the category
  await db.delete(trackerCategories).where(eq(trackerCategories.id, categoryId));

  revalidatePath("/metrics");
  revalidatePath("/settings");
  return { success: true };
}
