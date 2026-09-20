"use client";

import { useState, useTransition, lazy, Suspense } from "react";
import { surfaceErrors } from "@/lib/action-result";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { startWorkout, addSet, deleteSet, finishWorkout } from "@/app/actions/workout";
import type { Exercise } from "@/db/schema";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Trophy,
  Dumbbell,
  Clock,
  Calendar,
} from "lucide-react";
import { PageViewToggle } from "@/components/ui/view-toggle";
import { DateNavigator } from "@/components/ui/date-navigator";
import { useViewRange } from "@/lib/use-view-range";
import { filterByBounds, viewRangeBounds, viewRangeLabel } from "@/lib/view-range";

interface WorkoutSet {
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
}

interface SerializedWorkout {
  id: string;
  userId: string;
  name: string | null;
  date: string;
  duration: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface WorkoutClientProps {
  exercises: Exercise[];
  recentWorkouts: SerializedWorkout[];
  activeWorkout: SerializedWorkout | null;
  activeSets: WorkoutSet[];
}

const WorkoutChart = lazy(() => import("./workout-chart").then((m) => ({ default: m.WorkoutChart })));

export function WorkoutClient({
  exercises,
  recentWorkouts,
  activeWorkout,
  activeSets,
}: WorkoutClientProps) {
  const { view, anchor } = useViewRange("week");
  const bounds = viewRangeBounds(view, anchor ?? new Date());
  const rangedWorkouts = filterByBounds(recentWorkouts, bounds);
  const periodLabel = viewRangeLabel(view, anchor);
  const [isPending, startTransition] = useTransition();
  const [prAlert, setPrAlert] = useState<string | null>(null);

  // Add set form state
  const [selectedExercise, setSelectedExercise] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [unit, setUnit] = useState("lbs");

  // Finish workout form state
  const [showFinish, setShowFinish] = useState(false);
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");

  const muscleGroups = [...new Set(exercises.map((e) => e.muscleGroup))].sort();

  function handleAddSet() {
    if (!activeWorkout || !selectedExercise || !reps || !weight) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.set("workoutId", activeWorkout.id);
      fd.set("exerciseId", selectedExercise);
      fd.set("reps", reps);
      fd.set("weight", weight);
      fd.set("unit", unit);
      const result = await surfaceErrors(addSet(fd));
      if (result.isPR) {
        const ex = exercises.find((e) => e.id === selectedExercise);
        setPrAlert(`New PR! ${ex?.name ?? "Exercise"} — ${weight} ${unit} x ${reps}`);
        setTimeout(() => setPrAlert(null), 4000);
      }
      setReps("");
      setWeight("");
    });
  }

  function handleDeleteSet(setId: string) {
    if (!activeWorkout) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("setId", setId);
      fd.set("workoutId", activeWorkout.id);
      await surfaceErrors(deleteSet(fd));
    });
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h2>Workout</h2>
          <p className="text-muted-foreground mt-1">
            {activeWorkout ? "Active session" : "Log strength training"}
          </p>
        </div>
        {!activeWorkout && (
          <>
            <DateNavigator />
            <PageViewToggle defaultRange="week" />
            <Button asChild>
              <Link href="/records">
                <Trophy className="w-4 h-4 mr-2" />
                Records
              </Link>
            </Button>
          </>
        )}
      </div>

      {/* PR Alert */}
      {prAlert && (
        <div className="mb-6 p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center gap-3">
          <Trophy className="w-5 h-5 text-primary" />
          <span className="font-medium text-primary">{prAlert}</span>
        </div>
      )}

      {!activeWorkout ? (
        <>
          {/* Start Workout */}
          <form
            action={(fd) => startTransition(() => startWorkout(fd))}
            className="border border-border rounded-lg p-6 mb-8"
          >
            <Label htmlFor="name">Workout Name (optional)</Label>
            <div className="flex gap-3 mt-2">
              <Input id="name" name="name" placeholder="e.g. Push Day, Leg Day" />
              <Button type="submit" disabled={isPending}>
                <Plus className="w-4 h-4 mr-2" />
                Start
              </Button>
            </div>
          </form>

          {/* Chart */}
          <Suspense fallback={<div className="h-64 bg-card border border-border rounded-lg animate-pulse mb-8" />}>
            <WorkoutChart />
          </Suspense>

          <section>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
              {periodLabel} &middot; {rangedWorkouts.length} {rangedWorkouts.length === 1 ? "workout" : "workouts"}
            </h3>
            {rangedWorkouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No workouts in this period.</p>
            ) : (
              <div className="space-y-2">
                {rangedWorkouts.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between py-3 px-4 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <Dumbbell className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {w.name || "Workout"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {w.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {w.duration}min
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(w.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          {/* Active Workout — Add Set Form */}
          <div className="border border-border rounded-lg p-6 mb-6">
            <h3 className="text-sm font-medium mb-4">Add Set</h3>
            <div className="space-y-3">
              <div>
                <Label>Exercise</Label>
                <select
                  value={selectedExercise}
                  onChange={(e) => setSelectedExercise(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select exercise...</option>
                  {muscleGroups.map((group) => (
                    <optgroup key={group} label={group}>
                      {exercises
                        .filter((e) => e.muscleGroup === group)
                        .map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Reps</Label>
                  <Input
                    type="number"
                    min={1}
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    placeholder="8"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Weight</Label>
                  <Input
                    type="number"
                    min={0}
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="135"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-border rounded-lg bg-background"
                  >
                    <option value="lbs">lbs</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>
              <Button
                onClick={handleAddSet}
                disabled={!selectedExercise || !reps || !weight || isPending}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Set
              </Button>
            </div>
          </div>

          {/* Current Sets */}
          {activeSets.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden mb-6">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Exercise</th>
                    <th className="text-left px-4 py-3 font-medium">Set</th>
                    <th className="text-left px-4 py-3 font-medium">Reps</th>
                    <th className="text-left px-4 py-3 font-medium">Weight</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activeSets.map((set) => (
                    <tr key={set.id}>
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-medium">{set.exerciseName}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {set.muscleGroup}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">#{set.setNumber}</td>
                      <td className="px-4 py-3">{set.reps}</td>
                      <td className="px-4 py-3">
                        {set.weight} {set.unit}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSet(set.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Finish Workout */}
          {!showFinish ? (
            <Button variant="outline" onClick={() => setShowFinish(true)} className="w-full">
              Finish Workout
            </Button>
          ) : (
            <form
              action={(fd) => startTransition(() => finishWorkout(fd))}
              className="border border-border rounded-lg p-6 space-y-4"
            >
              <input type="hidden" name="workoutId" value={activeWorkout.id} />
              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  name="duration"
                  type="number"
                  min={1}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="45"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="How did it go?"
                  className="mt-1"
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Finishing..." : "Save & Finish"}
                </Button>
                <Button variant="outline" type="button" onClick={() => setShowFinish(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
