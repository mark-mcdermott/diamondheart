"use server";

import { db } from "@/db";
import { meditationSessions, meditationStyles, meditationPresets } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
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
    type: (formData.get("type") as string) || "guided",
    notes: (formData.get("notes") as string) || null,
    date: new Date(),
  });

  revalidatePath("/meditate");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateMeditationSession(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const sessionId = formData.get("sessionId") as string;
  const duration = parseInt(formData.get("duration") as string);
  if (!duration || duration <= 0) return { success: false, error: "Duration is required" };

  await db.update(meditationSessions)
    .set({
      duration,
      type: (formData.get("type") as string) || "guided",
      notes: (formData.get("notes") as string) || null,
    })
    .where(and(eq(meditationSessions.id, sessionId), eq(meditationSessions.userId, session.userId)));

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

// --- Seed Defaults ---

export async function seedMeditationDefaults(userId: string, seedStyles: boolean, seedPresets: boolean) {
  if (seedStyles) {
    await db.insert(meditationStyles).values([
      { id: crypto.randomUUID(), userId, label: "Guided", iconName: "brain", sortOrder: 0 },
      { id: crypto.randomUUID(), userId, label: "Breathing", iconName: "wind", sortOrder: 1 },
    ]);
  }
  if (seedPresets) {
    await db.insert(meditationPresets).values([
      { id: crypto.randomUUID(), userId, label: "5 min", seconds: 300, sortOrder: 0 },
      { id: crypto.randomUUID(), userId, label: "10 min", seconds: 600, sortOrder: 1 },
      { id: crypto.randomUUID(), userId, label: "15 min", seconds: 900, sortOrder: 2 },
      { id: crypto.randomUUID(), userId, label: "20 min", seconds: 1200, sortOrder: 3 },
      { id: crypto.randomUUID(), userId, label: "30 min", seconds: 1800, sortOrder: 4 },
    ]);
  }
}

// --- Styles ---

export async function getMeditationStyles(userId: string) {
  return db.select().from(meditationStyles)
    .where(eq(meditationStyles.userId, userId))
    .orderBy(asc(meditationStyles.sortOrder));
}

export async function addMeditationStyle(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const label = (formData.get("label") as string)?.trim();
  const iconName = (formData.get("iconName") as string)?.trim() || "brain";
  if (!label) return { success: false, error: "Label is required" };

  const existing = await db.select().from(meditationStyles)
    .where(eq(meditationStyles.userId, session.userId));

  await db.insert(meditationStyles).values({
    id: crypto.randomUUID(),
    userId: session.userId,
    label,
    iconName,
    sortOrder: existing.length,
  });

  revalidatePath("/meditate");
  revalidatePath("/meditate/edit");
  return { success: true };
}

export async function updateMeditationStyle(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const styleId = formData.get("styleId") as string;
  const label = (formData.get("label") as string)?.trim();
  const iconName = (formData.get("iconName") as string)?.trim() || "brain";
  if (!label) return { success: false, error: "Label is required" };

  await db.update(meditationStyles)
    .set({ label, iconName })
    .where(and(eq(meditationStyles.id, styleId), eq(meditationStyles.userId, session.userId)));

  revalidatePath("/meditate");
  revalidatePath("/meditate/edit");
  return { success: true };
}

export async function deleteMeditationStyle(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const styleId = formData.get("styleId") as string;
  await db.delete(meditationStyles)
    .where(and(eq(meditationStyles.id, styleId), eq(meditationStyles.userId, session.userId)));

  revalidatePath("/meditate");
  revalidatePath("/meditate/edit");
  return { success: true };
}

// --- Presets ---

export async function getMeditationPresets(userId: string) {
  return db.select().from(meditationPresets)
    .where(eq(meditationPresets.userId, userId))
    .orderBy(asc(meditationPresets.sortOrder));
}

export async function addMeditationPreset(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const label = (formData.get("label") as string)?.trim();
  const seconds = parseInt(formData.get("seconds") as string);
  if (!label) return { success: false, error: "Label is required" };
  if (!seconds || seconds <= 0) return { success: false, error: "Duration is required" };

  const existing = await db.select().from(meditationPresets)
    .where(eq(meditationPresets.userId, session.userId));

  await db.insert(meditationPresets).values({
    id: crypto.randomUUID(),
    userId: session.userId,
    label,
    seconds,
    sortOrder: existing.length,
  });

  revalidatePath("/meditate");
  revalidatePath("/meditate/edit");
  return { success: true };
}

export async function updateMeditationPreset(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const presetId = formData.get("presetId") as string;
  const label = (formData.get("label") as string)?.trim();
  const seconds = parseInt(formData.get("seconds") as string);
  if (!label) return { success: false, error: "Label is required" };
  if (!seconds || seconds <= 0) return { success: false, error: "Duration is required" };

  await db.update(meditationPresets)
    .set({ label, seconds })
    .where(and(eq(meditationPresets.id, presetId), eq(meditationPresets.userId, session.userId)));

  revalidatePath("/meditate");
  revalidatePath("/meditate/edit");
  return { success: true };
}

export async function deleteMeditationPreset(formData: FormData): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const presetId = formData.get("presetId") as string;
  await db.delete(meditationPresets)
    .where(and(eq(meditationPresets.id, presetId), eq(meditationPresets.userId, session.userId)));

  revalidatePath("/meditate");
  revalidatePath("/meditate/edit");
  return { success: true };
}
