"use server";

import { db } from "@/db";
import { entertainmentItems } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type Result = { success: boolean; error?: string };

export async function addEntertainment(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const title = formData.get("title") as string;
  const type = formData.get("type") as string;
  if (!title || !type) return { success: false, error: "Title and type are required" };

  await db.insert(entertainmentItems).values({
    id: crypto.randomUUID(),
    userId: session.userId,
    type,
    title,
    creator: (formData.get("creator") as string) || null,
    status: (formData.get("status") as string) || "completed",
    rating: formData.get("rating") ? parseInt(formData.get("rating") as string) : null,
    notes: (formData.get("notes") as string) || null,
    startDate: formData.get("startDate") ? new Date(formData.get("startDate") as string) : null,
    endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string) : null,
  });

  revalidatePath("/entertainment");
  return { success: true };
}

export async function updateEntertainment(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const itemId = formData.get("itemId") as string;
  if (!itemId) return { success: false, error: "Item ID required" };

  await db.update(entertainmentItems)
    .set({
      title: (formData.get("title") as string) || undefined,
      status: (formData.get("status") as string) || undefined,
      rating: formData.get("rating") ? parseInt(formData.get("rating") as string) : null,
      notes: (formData.get("notes") as string) || null,
      updatedAt: new Date(),
    })
    .where(and(eq(entertainmentItems.id, itemId), eq(entertainmentItems.userId, session.userId)));

  revalidatePath("/entertainment");
  return { success: true };
}

export async function deleteEntertainment(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const itemId = formData.get("itemId") as string;
  await db.delete(entertainmentItems)
    .where(and(eq(entertainmentItems.id, itemId), eq(entertainmentItems.userId, session.userId)));

  revalidatePath("/entertainment");
  return { success: true };
}
