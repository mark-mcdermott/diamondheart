import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { trackerCategories, trackerMetrics, userNavItems, type TrackerCategory } from "@/db/schema";
import { slugify } from "@/lib/slug";
import type { ApiHandler } from "./_lib/context";
import { requireSession } from "./_lib/guard";
import { HttpError, fail, handler, json, noContent, notFound, readJson } from "./_lib/http";
import { createCategorySchema, updateCategorySchema } from "./_lib/schemas";

export const DEFAULT_CATEGORY_SLUG = "default";

export function listCategories(userId: string): Promise<TrackerCategory[]> {
  return db
    .select()
    .from(trackerCategories)
    .where(eq(trackerCategories.userId, userId))
    .orderBy(trackerCategories.sortOrder);
}

/** The category metrics fall back to, created on first need. */
export async function ensureDefaultCategory(userId: string): Promise<TrackerCategory> {
  const [existing] = await db
    .select()
    .from(trackerCategories)
    .where(and(eq(trackerCategories.slug, DEFAULT_CATEGORY_SLUG), eq(trackerCategories.userId, userId)))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(trackerCategories)
    .values({ id: crypto.randomUUID(), userId, name: "General", slug: DEFAULT_CATEGORY_SLUG, sortOrder: "0" })
    .returning();
  return created;
}

export async function createCategory(userId: string, name: string): Promise<TrackerCategory> {
  const slug = slugify(name);
  if (!slug) throw new HttpError(fail(422, "Validation failed", { name: ["Name needs a letter or a number"] }));

  const [existing] = await db
    .select({ id: trackerCategories.id })
    .from(trackerCategories)
    .where(and(eq(trackerCategories.slug, slug), eq(trackerCategories.userId, userId)))
    .limit(1);
  if (existing) throw new HttpError(fail(409, "Category already exists"));

  const [maxSort] = await db
    .select({ max: sql<string>`COALESCE(MAX(${trackerCategories.sortOrder}), '-1')` })
    .from(trackerCategories)
    .where(eq(trackerCategories.userId, userId));
  const nextSort = String(parseInt(maxSort?.max ?? "-1", 10) + 1);

  const [created] = await db
    .insert(trackerCategories)
    .values({ id: crypto.randomUUID(), userId, name, slug, sortOrder: nextSort })
    .returning();
  return created;
}

/** Renames a category and the nav item that points at it. */
export async function renameCategory(userId: string, categoryId: string, name: string): Promise<TrackerCategory> {
  const slug = slugify(name);
  if (!slug) throw new HttpError(fail(422, "Validation failed", { name: ["Name needs a letter or a number"] }));

  const [renamed] = await db
    .update(trackerCategories)
    .set({ name, slug })
    .where(and(eq(trackerCategories.id, categoryId), eq(trackerCategories.userId, userId)))
    .returning();
  if (!renamed) throw new HttpError(notFound("Category not found"));

  await db
    .update(userNavItems)
    .set({ label: name, href: `/metrics#${slug}`, updatedAt: new Date() })
    .where(
      and(
        eq(userNavItems.userId, userId),
        eq(userNavItems.referenceId, categoryId),
        eq(userNavItems.itemType, "metric_category")
      )
    );

  return renamed;
}

/**
 * Deletes a category. Its metrics move to the default category rather than
 * being lost, and its nav item goes with it. The default category itself
 * cannot be deleted.
 */
export async function deleteCategory(userId: string, categoryId: string): Promise<void> {
  const [target] = await db
    .select({ id: trackerCategories.id, slug: trackerCategories.slug })
    .from(trackerCategories)
    .where(and(eq(trackerCategories.id, categoryId), eq(trackerCategories.userId, userId)))
    .limit(1);
  if (!target) throw new HttpError(notFound("Category not found"));
  if (target.slug === DEFAULT_CATEGORY_SLUG) {
    throw new HttpError(fail(409, "The default category cannot be deleted"));
  }

  const fallback = await ensureDefaultCategory(userId);

  await db
    .update(trackerMetrics)
    .set({ categoryId: fallback.id, updatedAt: new Date() })
    .where(and(eq(trackerMetrics.categoryId, categoryId), eq(trackerMetrics.userId, userId)));

  await db
    .delete(userNavItems)
    .where(
      and(
        eq(userNavItems.userId, userId),
        eq(userNavItems.referenceId, categoryId),
        eq(userNavItems.itemType, "metric_category")
      )
    );

  await db
    .delete(trackerCategories)
    .where(and(eq(trackerCategories.id, categoryId), eq(trackerCategories.userId, userId)));
}

export const GET: ApiHandler = ({ request }) =>
  handler(async () => {
    const { userId } = await requireSession(request);
    return json({ categories: await listCategories(userId) });
  });

export const POST: ApiHandler = ({ request }) =>
  handler(async () => {
    const { userId } = await requireSession(request);
    const { name } = await readJson(request, createCategorySchema);
    return json({ category: await createCategory(userId, name) }, 201);
  });

export const item = {
  PATCH: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      const { name } = await readJson(request, updateCategorySchema);
      return json({ category: await renameCategory(userId, params.id, name) });
    })) satisfies ApiHandler,

  DELETE: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      await deleteCategory(userId, params.id);
      return noContent();
    })) satisfies ApiHandler,
};
