import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { exercises, workouts, workoutSets } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { WorkoutClient } from "./workout-client";

export default async function WorkoutPage({
  searchParams,
}: {
  searchParams: Promise<{ active?: string }>;
}) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const { active: activeWorkoutId } = await searchParams;
  const userId = session.userId;

  // Get exercise library (built-in + user's custom)
  const builtInExercises = await db
    .select()
    .from(exercises)
    .where(eq(exercises.isCustom, false))
    .orderBy(exercises.muscleGroup, exercises.name);

  const customExercises = await db
    .select()
    .from(exercises)
    .where(and(eq(exercises.isCustom, true), eq(exercises.userId, userId)))
    .orderBy(exercises.name);

  const allExercises = [...builtInExercises, ...customExercises];

  // Recent workouts
  const recentWorkouts = await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(desc(workouts.date))
    .limit(10);

  // Active workout with sets
  let activeWorkout = null;
  let activeSets: Array<{
    id: string;
    workoutId: string;
    exerciseId: string;
    setNumber: number;
    reps: number;
    weight: number;
    unit: string;
    type: string;
    notes: string | null;
    createdAt: string;
    exerciseName: string;
    muscleGroup: string;
  }> = [];

  if (activeWorkoutId) {
    const [found] = await db
      .select()
      .from(workouts)
      .where(and(eq(workouts.id, activeWorkoutId), eq(workouts.userId, userId)))
      .limit(1);

    if (found) {
      activeWorkout = { ...found, date: found.date.toISOString(), createdAt: found.createdAt.toISOString(), updatedAt: found.updatedAt.toISOString() };

      const sets = await db
        .select({
          id: workoutSets.id,
          workoutId: workoutSets.workoutId,
          exerciseId: workoutSets.exerciseId,
          setNumber: workoutSets.setNumber,
          reps: workoutSets.reps,
          weight: workoutSets.weight,
          unit: workoutSets.unit,
          type: workoutSets.type,
          notes: workoutSets.notes,
          createdAt: workoutSets.createdAt,
          exerciseName: exercises.name,
          muscleGroup: exercises.muscleGroup,
        })
        .from(workoutSets)
        .innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
        .where(eq(workoutSets.workoutId, activeWorkoutId))
        .orderBy(workoutSets.createdAt);

      activeSets = sets.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }));
    }
  }

  return (
    <WorkoutClient
      exercises={allExercises}
      recentWorkouts={recentWorkouts.map((w) => ({
        ...w,
        date: w.date.toISOString(),
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
      }))}
      activeWorkout={activeWorkout}
      activeSets={activeSets}
    />
  );
}
