"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import * as meditation from "@/server/api/meditation";
import { asResult, type ActionResult } from "./api-result";

/** Thin wrappers over `src/server/api/meditation.ts`, kept until Phase 3 moves the meditate pages onto `/api/meditation/*`. */

type Result = ActionResult;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function int(formData: FormData, key: string): number {
  return Number.parseInt(text(formData, key), 10);
}

async function run(paths: string[], work: (userId: string) => Promise<unknown>): Promise<Result> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };
  const result = await asResult(() => work(session.userId));
  for (const path of paths) revalidatePath(path);
  return result;
}

export async function logMeditationSession(formData: FormData): Promise<Result> {
  const duration = int(formData, "duration");
  if (!duration || duration <= 0) return { success: false, error: "Duration is required" };
  return run(["/meditate", "/dashboard"], (userId) =>
    meditation.createSession(userId, { duration, type: text(formData, "type") || "guided", notes: text(formData, "notes") || null })
  );
}

export async function updateMeditationSession(formData: FormData): Promise<Result> {
  const duration = int(formData, "duration");
  if (!duration || duration <= 0) return { success: false, error: "Duration is required" };
  return run(["/meditate", "/dashboard"], (userId) =>
    meditation.updateSession(userId, text(formData, "sessionId"), { duration, type: text(formData, "type") || "guided", notes: text(formData, "notes") || null })
  );
}

export async function deleteMeditationSession(formData: FormData): Promise<Result> {
  return run(["/meditate"], (userId) => meditation.deleteSession(userId, text(formData, "sessionId")));
}

export async function getDefaultTimerSeconds(userId: string): Promise<number> {
  return meditation.defaultTimerSeconds(userId);
}

export async function setDefaultTimerSeconds(formData: FormData): Promise<Result> {
  const seconds = int(formData, "seconds");
  if (!seconds || seconds <= 0) return { success: false, error: "Duration is required" };
  return run(["/meditate", "/meditate/edit"], (userId) => meditation.setDefaultTimer(userId, seconds));
}

export async function seedMeditationDefaults(userId: string, seedStyles: boolean, seedPresets: boolean) {
  if (seedStyles || seedPresets) await meditation.ensureDefaults(userId);
}

export async function getMeditationStyles(userId: string) {
  return meditation.listStyles(userId);
}

export async function addMeditationStyle(formData: FormData): Promise<Result> {
  const label = text(formData, "label");
  if (!label) return { success: false, error: "Label is required" };
  return run(["/meditate", "/meditate/edit"], (userId) => meditation.createStyle(userId, { label, iconName: text(formData, "iconName") || "brain" }));
}

export async function updateMeditationStyle(formData: FormData): Promise<Result> {
  const label = text(formData, "label");
  if (!label) return { success: false, error: "Label is required" };
  return run(["/meditate", "/meditate/edit"], (userId) =>
    meditation.updateStyle(userId, text(formData, "styleId"), { label, iconName: text(formData, "iconName") || "brain" })
  );
}

export async function deleteMeditationStyle(formData: FormData): Promise<Result> {
  return run(["/meditate", "/meditate/edit"], (userId) => meditation.deleteStyle(userId, text(formData, "styleId")));
}

export async function getMeditationPresets(userId: string) {
  return meditation.listPresets(userId);
}

export async function addMeditationPreset(formData: FormData): Promise<Result> {
  const label = text(formData, "label");
  const seconds = int(formData, "seconds");
  if (!label) return { success: false, error: "Label is required" };
  if (!seconds || seconds <= 0) return { success: false, error: "Duration is required" };
  return run(["/meditate", "/meditate/edit"], (userId) => meditation.createPreset(userId, { label, seconds }));
}

export async function updateMeditationPreset(formData: FormData): Promise<Result> {
  const label = text(formData, "label");
  const seconds = int(formData, "seconds");
  if (!label) return { success: false, error: "Label is required" };
  if (!seconds || seconds <= 0) return { success: false, error: "Duration is required" };
  return run(["/meditate", "/meditate/edit"], (userId) => meditation.updatePreset(userId, text(formData, "presetId"), { label, seconds }));
}

export async function deleteMeditationPreset(formData: FormData): Promise<Result> {
  return run(["/meditate", "/meditate/edit"], (userId) => meditation.deletePreset(userId, text(formData, "presetId")));
}
