import { and, desc, eq, gte, inArray, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { exercises, personalRecords, workoutSets, workouts } from "@/db/schema";
import { dayBounds, parseDate } from "@/lib/dates";
import type { ApiHandler } from "./_lib/context";
import { requireSession } from "./_lib/guard";
import { HttpError, fail, handler, json, noContent, notFound, readJson } from "./_lib/http";
import { addSetSchema, calendarDay, createWorkoutSchema, finishWorkoutSchema, type AddSet, type CreateWorkout, type FinishWorkout } from "./_lib/schemas";

export type Workout = typeof workouts.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type WorkoutSet = typeof workoutSets.$inferSelect & { exerciseName: string; muscleGroup: string };

export interface WorkoutOverview {
  /** Built-in exercises first, then the caller's custom ones. */
  exercises: Exercise[];
  /** Newest first, at most five hundred. */
  recentWorkouts: Workout[];
  active: { workout: Workout; sets: WorkoutSet[] } | null;
}

/** Built-in exercises are shared; custom ones belong to whoever made them. */
function usableExercise(userId: string) {
  return or(eq(exercises.isCustom, false), and(eq(exercises.isCustom, true), eq(exercises.userId, userId)));
}

export async function listExercises(userId: string): Promise<Exercise[]> {
  const [builtIn, custom] = await Promise.all([
    db.select().from(exercises).where(eq(exercises.isCustom, false)).orderBy(exercises.muscleGroup, exercises.name),
    db.select().from(exercises).where(and(eq(exercises.isCustom, true), eq(exercises.userId, userId))).orderBy(exercises.name),
  ]);
  return [...builtIn, ...custom];
}

async function ownedWorkout(userId: string, id: string): Promise<Workout> {
  const [row] = await db.select().from(workouts).where(and(eq(workouts.id, id), eq(workouts.userId, userId))).limit(1);
  if (!row) throw new HttpError(notFound("Workout not found"));
  return row;
}

export async function listSets(userId: string, workoutId: string): Promise<WorkoutSet[]> {
  await ownedWorkout(userId, workoutId);
  const rows = await db
    .select({ set: workoutSets, exerciseName: exercises.name, muscleGroup: exercises.muscleGroup })
    .from(workoutSets)
    .innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
    .where(eq(workoutSets.workoutId, workoutId))
    .orderBy(workoutSets.createdAt);
  return rows.map((r) => ({ ...r.set, exerciseName: r.exerciseName, muscleGroup: r.muscleGroup }));
}

export async function readOverview(userId: string, activeId: string | null): Promise<WorkoutOverview> {
  const [exerciseList, recentWorkouts] = await Promise.all([
    listExercises(userId),
    db.select().from(workouts).where(eq(workouts.userId, userId)).orderBy(desc(workouts.date)).limit(500),
  ]);
  let active: WorkoutOverview["active"] = null;
  if (activeId) {
    const [workout] = await db.select().from(workouts).where(and(eq(workouts.id, activeId), eq(workouts.userId, userId))).limit(1);
    if (workout) active = { workout, sets: await listSets(userId, activeId) };
  }
  return { exercises: exerciseList, recentWorkouts, active };
}

export async function startWorkout(userId: string, input: CreateWorkout): Promise<Workout> {
  const [row] = await db.insert(workouts).values({ id: crypto.randomUUID(), userId, name: input.name ?? null, date: new Date() }).returning();
  return row;
}

export async function finishWorkout(userId: string, id: string, patch: FinishWorkout): Promise<Workout> {
  const columns: Partial<typeof workouts.$inferInsert> = {};
  if (patch.duration !== undefined) columns.duration = patch.duration;
  if (patch.notes !== undefined) columns.notes = patch.notes;
  const [row] =
    Object.keys(columns).length === 0
      ? [await ownedWorkout(userId, id)]
      : await db.update(workouts).set({ ...columns, updatedAt: new Date() }).where(and(eq(workouts.id, id), eq(workouts.userId, userId))).returning();
  if (!row) throw new HttpError(notFound("Workout not found"));
  return row;
}

/**
 * Adds the next set of an exercise to a workout and records a personal record
 * when it beats the best weight at that rep count.
 */
export async function addSet(userId: string, workoutId: string, input: AddSet): Promise<{ set: WorkoutSet; isPR: boolean }> {
  await ownedWorkout(userId, workoutId);

  const [exercise] = await db.select().from(exercises).where(and(eq(exercises.id, input.exerciseId), usableExercise(userId))).limit(1);
  if (!exercise) throw new HttpError(notFound("Exercise not found"));

  const [last] = await db
    .select({ setNumber: workoutSets.setNumber })
    .from(workoutSets)
    .where(and(eq(workoutSets.workoutId, workoutId), eq(workoutSets.exerciseId, exercise.id)))
    .orderBy(desc(workoutSets.setNumber))
    .limit(1);

  const unit = input.unit ?? "lbs";
  const [set] = await db
    .insert(workoutSets)
    .values({
      id: crypto.randomUUID(),
      workoutId,
      exerciseId: exercise.id,
      setNumber: (last?.setNumber ?? 0) + 1,
      reps: input.reps,
      weight: input.weight,
      unit,
      type: input.type ?? "regular",
      notes: input.notes ?? null,
    })
    .returning();

  const [existingPR] = await db
    .select()
    .from(personalRecords)
    .where(and(eq(personalRecords.userId, userId), eq(personalRecords.exerciseId, exercise.id), eq(personalRecords.repCount, input.reps)))
    .limit(1);

  let isPR = false;
  if (!existingPR || input.weight > existingPR.weight) {
    if (existingPR) await db.delete(personalRecords).where(eq(personalRecords.id, existingPR.id));
    await db.insert(personalRecords).values({
      id: crypto.randomUUID(),
      userId,
      exerciseId: exercise.id,
      repCount: input.reps,
      weight: input.weight,
      unit,
      date: new Date(),
      setId: set.id,
    });
    isPR = true;
  }

  return { set: { ...set, exerciseName: exercise.name, muscleGroup: exercise.muscleGroup }, isPR };
}

/** Sets have no `user_id`; ownership is the workout's, checked in the same statement. */
export async function deleteSet(userId: string, setId: string): Promise<void> {
  const deleted = await db
    .delete(workoutSets)
    .where(and(eq(workoutSets.id, setId), inArray(workoutSets.workoutId, db.select({ id: workouts.id }).from(workouts).where(eq(workouts.userId, userId)))))
    .returning({ id: workoutSets.id });
  if (deleted.length === 0) throw new HttpError(notFound("Set not found"));
}

/** Per day: total minutes, total volume (weight × reps), and sessions. */
export async function dailyTotals(userId: string, from: Date, to: Date) {
  const rows = await db
    .select({
      date: sql<string>`DATE(${workouts.date})`,
      duration: sql<number>`COALESCE(SUM(${workouts.duration}), 0)`,
      volume: sql<number>`COALESCE(SUM(${workoutSets.weight} * ${workoutSets.reps}), 0)`,
      count: sql<number>`COUNT(DISTINCT ${workouts.id})`,
    })
    .from(workouts)
    .leftJoin(workoutSets, eq(workoutSets.workoutId, workouts.id))
    .where(and(eq(workouts.userId, userId), gte(workouts.date, from), lt(workouts.date, to)))
    .groupBy(sql`DATE(${workouts.date})`)
    .orderBy(sql`DATE(${workouts.date})`);
  return rows.map((r) => ({ date: String(r.date), duration: Number(r.duration), volume: Number(r.volume), sessions: Number(r.count) }));
}

function dayParam(request: Request, name: string): Date {
  const parsed = calendarDay.safeParse(new URL(request.url).searchParams.get(name) ?? "");
  if (!parsed.success) throw new HttpError(fail(422, "Validation failed", { [name]: ["Must be YYYY-MM-DD"] }));
  return parseDate(parsed.data);
}

export const GET: ApiHandler = ({ request }) =>
  handler(async () => {
    const { userId } = await requireSession(request);
    return json(await readOverview(userId, new URL(request.url).searchParams.get("active")));
  });

export const workoutList = {
  POST: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      return json({ workout: await startWorkout(userId, await readJson(request, createWorkoutSchema)) }, 201);
    })) satisfies ApiHandler,
};

export const workout = {
  PATCH: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      return json({ workout: await finishWorkout(userId, params.id, await readJson(request, finishWorkoutSchema)) });
    })) satisfies ApiHandler,
};

export const sets = {
  POST: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      return json(await addSet(userId, params.id, await readJson(request, addSetSchema)), 201);
    })) satisfies ApiHandler,
};

export const set = {
  DELETE: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      await deleteSet(userId, params.id);
      return noContent();
    })) satisfies ApiHandler,
};

export const totals = {
  GET: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      const from = dayParam(request, "from");
      const to = dayParam(request, "to");
      if (to < from) throw new HttpError(fail(422, "Validation failed", { to: ["Must not be before from"] }));
      return json({ days: await dailyTotals(userId, from, dayBounds(to).end) });
    })) satisfies ApiHandler,
};

