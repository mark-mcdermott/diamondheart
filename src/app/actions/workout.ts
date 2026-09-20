"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { HttpError, type ApiError } from "@/server/api/_lib/http";
import * as workout from "@/server/api/workout";

/** Thin wrappers over `src/server/api/workout.ts`, kept until Phase 3. */

export type WorkoutActionResult = {
  success: boolean;
  error?: string;
  isPR?: boolean;
  workoutId?: string;
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function failure(cause: unknown): Promise<WorkoutActionResult> {
  if (!(cause instanceof HttpError)) throw cause;
  const body = (await cause.response.json()) as ApiError;
  return { success: false, error: body.fields ? Object.values(body.fields)[0]?.[0] ?? body.error : body.error };
}

export async function startWorkout(formData: FormData): Promise<void> {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  const created = await workout.startWorkout(session.userId, { name: text(formData, "name") || null });
  redirect(`/workout?active=${created.id}`);
}

export async function addSet(formData: FormData): Promise<WorkoutActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const workoutId = text(formData, "workoutId");
  const exerciseId = text(formData, "exerciseId");
  const reps = Number.parseInt(text(formData, "reps"), 10);
  const weight = Number.parseInt(text(formData, "weight"), 10);
  if (!workoutId || !exerciseId || Number.isNaN(reps) || Number.isNaN(weight)) return { success: false, error: "Missing required fields" };

  try {
    const { isPR } = await workout.addSet(session.userId, workoutId, { exerciseId, reps, weight, unit: text(formData, "unit") || "lbs", type: text(formData, "type") || "regular" });
    revalidatePath("/workout");
    return { success: true, isPR, workoutId };
  } catch (cause) {
    return failure(cause);
  }
}

export async function deleteSet(formData: FormData): Promise<WorkoutActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };
  const setId = text(formData, "setId");
  if (!setId) return { success: false, error: "Set ID is required" };
  try {
    await workout.deleteSet(session.userId, setId);
    revalidatePath("/workout");
    return { success: true, workoutId: text(formData, "workoutId") };
  } catch (cause) {
    return failure(cause);
  }
}

export async function finishWorkout(formData: FormData): Promise<void> {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  const workoutId = text(formData, "workoutId");
  if (!workoutId) return;
  const duration = Number.parseInt(text(formData, "duration"), 10);
  try {
    await workout.finishWorkout(session.userId, workoutId, { duration: Number.isNaN(duration) ? null : duration, notes: text(formData, "notes") || null });
  } catch (cause) {
    if (!(cause instanceof HttpError)) throw cause;
  }
  redirect("/workout");
}
