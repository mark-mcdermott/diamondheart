"use server";

import { db } from "@/db";
import { trackingItems } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type Result = { success: boolean; error?: string };

export async function addTrackingItem(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const name = formData.get("name") as string;
  if (!name) return { success: false, error: "Name is required" };

  await db.insert(trackingItems).values({
    id: crypto.randomUUID(),
    userId: session.userId,
    name,
    category: (formData.get("category") as string) || null,
    count: parseInt(formData.get("count") as string) || 0,
    unit: (formData.get("unit") as string) || null,
    icon: (formData.get("icon") as string) || null,
    notes: (formData.get("notes") as string) || null,
  });

  revalidatePath("/tracking");
  return { success: true };
}

export async function updateTrackingCount(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const itemId = formData.get("itemId") as string;
  const delta = parseInt(formData.get("delta") as string) || 1;

  const [item] = await db.select().from(trackingItems)
    .where(and(eq(trackingItems.id, itemId), eq(trackingItems.userId, session.userId)))
    .limit(1);

  if (!item) return { success: false, error: "Not found" };

  await db.update(trackingItems)
    .set({ count: item.count + delta, updatedAt: new Date() })
    .where(eq(trackingItems.id, itemId));

  revalidatePath("/tracking");
  return { success: true };
}

export async function updateTrackingItem(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const itemId = formData.get("itemId") as string;
  const name = formData.get("name") as string;
  if (!itemId || !name) return { success: false, error: "Required fields missing" };

  await db.update(trackingItems)
    .set({
      name,
      category: (formData.get("category") as string) || null,
      count: parseInt(formData.get("count") as string) || 0,
      unit: (formData.get("unit") as string) || null,
      notes: (formData.get("notes") as string) || null,
      updatedAt: new Date(),
    })
    .where(and(eq(trackingItems.id, itemId), eq(trackingItems.userId, session.userId)));

  revalidatePath("/tracking");
  return { success: true };
}

export async function deleteTrackingItem(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const itemId = formData.get("itemId") as string;
  await db.delete(trackingItems)
    .where(and(eq(trackingItems.id, itemId), eq(trackingItems.userId, session.userId)));

  revalidatePath("/tracking");
  return { success: true };
}
