"use server";

import { db } from "@/db";
import { userPreferences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type Result = { success: boolean; error?: string };

const DEFAULT_PREFERENCES = {
  useNetflixUI: false,
} as const;

export async function getUserPreferences(userId: string) {
  const [prefs] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  if (!prefs) {
    return { ...DEFAULT_PREFERENCES };
  }

  return {
    useNetflixUI: prefs.useNetflixUI,
  };
}

export async function toggleNetflixUI(formData: FormData): Promise<Result> {
  void formData; // consumed by form action signature
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const [existing] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.userId))
    .limit(1);

  if (existing) {
    await db
      .update(userPreferences)
      .set({ useNetflixUI: !existing.useNetflixUI, updatedAt: new Date() })
      .where(eq(userPreferences.id, existing.id));
  } else {
    await db.insert(userPreferences).values({
      id: crypto.randomUUID(),
      userId: session.userId,
      useNetflixUI: true,
    });
  }

  revalidatePath("/entertainment");
  return { success: true };
}
