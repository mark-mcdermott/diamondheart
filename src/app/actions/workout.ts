"use server";

import { db } from "@/db";
import {
  workouts,
  workoutSets,
  personalRecords,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type WorkoutActionResult = {
  success: boolean;
  error?: string;
  isPR?: boolean;
  workoutId?: string;
};

export async function startWorkout(formData: FormData): Promise<void> {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const name = (formData.get("name") as string) || null;
  const workoutId = crypto.randomUUID();

  await db.insert(workouts).values({
    id: workoutId,
    userId: session.userId,
    name,
    date: new Date(),
  });

  redirect(`/workout?active=${workoutId}`);
}

export async function addSet(formData: FormData): Promise<WorkoutActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const workoutId = formData.get("workoutId") as string;
  const exerciseId = formData.get("exerciseId") as string;
  const reps = parseInt(formData.get("reps") as string);
  const weight = parseInt(formData.get("weight") as string);
  const unit = (formData.get("unit") as string) || "lbs";
  const type = (formData.get("type") as string) || "regular";

  if (!workoutId || !exerciseId || isNaN(reps) || isNaN(weight)) {
    return { success: false, error: "Missing required fields" };
  }

  // Get next set number
  const existingSets = await db
    .select({ setNumber: workoutSets.setNumber })
    .from(workoutSets)
    .where(
      and(
        eq(workoutSets.workoutId, workoutId),
        eq(workoutSets.exerciseId, exerciseId)
      )
    )
    .orderBy(desc(workoutSets.setNumber))
    .limit(1);

  const setNumber = existingSets.length > 0 ? existingSets[0].setNumber + 1 : 1;
  const setId = crypto.randomUUID();

  await db.insert(workoutSets).values({
    id: setId,
    workoutId,
    exerciseId,
    setNumber,
    reps,
    weight,
    unit,
    type,
  });

  // Check for personal record
  const existingPR = await db
    .select()
    .from(personalRecords)
    .where(
      and(
        eq(personalRecords.userId, session.userId),
        eq(personalRecords.exerciseId, exerciseId),
        eq(personalRecords.repCount, reps)
      )
    )
    .limit(1);

  let isPR = false;

  if (existingPR.length === 0) {
    await db.insert(personalRecords).values({
      id: crypto.randomUUID(),
      userId: session.userId,
      exerciseId,
      repCount: reps,
      weight,
      unit,
      date: new Date(),
      setId,
    });
    isPR = true;
  } else if (weight > existingPR[0].weight) {
    await db.delete(personalRecords).where(eq(personalRecords.id, existingPR[0].id));
    await db.insert(personalRecords).values({
      id: crypto.randomUUID(),
      userId: session.userId,
      exerciseId,
      repCount: reps,
      weight,
      unit,
      date: new Date(),
      setId,
    });
    isPR = true;
  }

  revalidatePath("/workout");
  return { success: true, isPR, workoutId };
}

export async function deleteSet(formData: FormData): Promise<WorkoutActionResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Unauthorized" };

  const setId = formData.get("setId") as string;
  const workoutId = formData.get("workoutId") as string;

  if (!setId) return { success: false, error: "Set ID is required" };

  await db.delete(workoutSets).where(eq(workoutSets.id, setId));

  revalidatePath("/workout");
  return { success: true, workoutId };
}

export async function finishWorkout(formData: FormData): Promise<void> {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const workoutId = formData.get("workoutId") as string;
  const duration = parseInt(formData.get("duration") as string);
  const notes = (formData.get("notes") as string) || null;

  if (!workoutId) return;

  await db
    .update(workouts)
    .set({
      duration: isNaN(duration) ? null : duration,
      notes,
      updatedAt: new Date(),
    })
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, session.userId)));

  redirect("/workout");
}
