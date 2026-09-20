import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { trackingItems } from "@/db/schema";
import type { ApiHandler } from "./_lib/context";
import { requireSession } from "./_lib/guard";
import { HttpError, handler, json, noContent, notFound, readJson } from "./_lib/http";
import { createTrackingItemSchema, trackingDeltaSchema, updateTrackingItemSchema, type CreateTrackingItem, type UpdateTrackingItem } from "./_lib/schemas";

export type TrackingItem = typeof trackingItems.$inferSelect;

export function listItems(userId: string): Promise<TrackingItem[]> {
  return db.select().from(trackingItems).where(eq(trackingItems.userId, userId)).orderBy(asc(trackingItems.category), asc(trackingItems.name));
}

export async function createItem(userId: string, input: CreateTrackingItem): Promise<TrackingItem> {
  const [row] = await db
    .insert(trackingItems)
    .values({
      id: crypto.randomUUID(),
      userId,
      name: input.name,
      category: input.category ?? null,
      count: input.count ?? 0,
      unit: input.unit ?? null,
      icon: input.icon ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  return row;
}

export async function updateItem(userId: string, id: string, patch: UpdateTrackingItem): Promise<TrackingItem> {
  const columns: Partial<typeof trackingItems.$inferInsert> = {};
  for (const key of ["name", "category", "count", "unit", "icon", "notes"] as const) {
    if (patch[key] !== undefined) (columns as Record<string, unknown>)[key] = patch[key];
  }
  const [row] =
    Object.keys(columns).length === 0
      ? await db.select().from(trackingItems).where(and(eq(trackingItems.id, id), eq(trackingItems.userId, userId))).limit(1)
      : await db.update(trackingItems).set({ ...columns, updatedAt: new Date() }).where(and(eq(trackingItems.id, id), eq(trackingItems.userId, userId))).returning();
  if (!row) throw new HttpError(notFound("Item not found"));
  return row;
}

/** Adds `delta` to the count in one statement, so two taps cannot lose each other's increment. */
export async function adjustCount(userId: string, id: string, delta: number): Promise<TrackingItem> {
  const [row] = await db
    .update(trackingItems)
    .set({ count: sql`${trackingItems.count} + ${delta}`, updatedAt: new Date() })
    .where(and(eq(trackingItems.id, id), eq(trackingItems.userId, userId)))
    .returning();
  if (!row) throw new HttpError(notFound("Item not found"));
  return row;
}

export async function deleteItem(userId: string, id: string): Promise<void> {
  const deleted = await db.delete(trackingItems).where(and(eq(trackingItems.id, id), eq(trackingItems.userId, userId))).returning({ id: trackingItems.id });
  if (deleted.length === 0) throw new HttpError(notFound("Item not found"));
}

export const GET: ApiHandler = ({ request }) =>
  handler(async () => {
    const { userId } = await requireSession(request);
    return json({ items: await listItems(userId) });
  });

export const POST: ApiHandler = ({ request }) =>
  handler(async () => {
    const { userId } = await requireSession(request);
    return json({ item: await createItem(userId, await readJson(request, createTrackingItemSchema)) }, 201);
  });

export const item = {
  PATCH: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      return json({ item: await updateItem(userId, params.id, await readJson(request, updateTrackingItemSchema)) });
    })) satisfies ApiHandler,
  DELETE: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      await deleteItem(userId, params.id);
      return noContent();
    })) satisfies ApiHandler,
};

export const count = {
  POST: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      const { delta } = await readJson(request, trackingDeltaSchema);
      return json({ item: await adjustCount(userId, params.id, delta) });
    })) satisfies ApiHandler,
};
