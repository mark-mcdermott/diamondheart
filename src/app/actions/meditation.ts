"use server";

import { db } from "@/db";
import { meditationSessions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type Result = { success: boolean; error?: string };

export async function logMeditationSession(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const duration = parseInt(formData.get("duration") as string);
  if (!duration || duration <= 0) return { success: false, error: "Duration is required" };

  await db.insert(meditationSessions).values({
    id: crypto.randomUUID(),
    userId: session.userId,
    duration,
    type: (formData.get("type") as string) || "silent",
    notes: (formData.get("notes") as string) || null,
    date: new Date(),
  });

  revalidatePath("/meditate");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteMeditationSession(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const sessionId = formData.get("sessionId") as string;
  await db.delete(meditationSessions)
    .where(and(eq(meditationSessions.id, sessionId), eq(meditationSessions.userId, session.userId)));

  revalidatePath("/meditate");
  return { success: true };
}
