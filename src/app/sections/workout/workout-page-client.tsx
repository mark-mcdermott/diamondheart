"use client";

import { Link } from "@/app/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api, errorMessage, keys } from "@/app/api";
import { RetryCard } from "@/components/ui/retry-card";
import { Skeleton, SkeletonRow } from "@/components/ui/skeleton";
import { WorkoutClient } from "./workout-client";

function BackLink() {
  return (
    <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
      <ArrowLeft className="w-5 h-5" />
    </Link>
  );
}

export function WorkoutPageClient({ activeWorkoutId }: { activeWorkoutId: string | null }) {
  const overview = useQuery({ queryKey: keys.workout(activeWorkoutId), queryFn: () => api.workout.overview(activeWorkoutId) });

  if (overview.isPending) {
    return (
      <div className="max-w-3xl mx-auto" aria-busy="true" aria-label="Loading workout">
        <div className="flex items-center gap-4 mb-8">
          <BackLink />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-32 rounded-lg" />
            <Skeleton className="h-3.5 w-48" />
          </div>
        </div>
        <Skeleton className="h-28 rounded-lg mb-8" />
        <Skeleton className="h-64 rounded-lg mb-8" />
        <Skeleton className="h-3 w-32 mb-4" />
        <div className="space-y-2">
          <SkeletonRow className="border border-border" />
          <SkeletonRow className="border border-border" />
        </div>
      </div>
    );
  }

  if (overview.isError) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <BackLink />
        </div>
        <RetryCard title="Workout could not be loaded" message={errorMessage(overview.error)} onRetry={() => void overview.refetch()} />
      </div>
    );
  }

  const { exercises, recentWorkouts, active } = overview.data;
  return (
    <WorkoutClient
      exercises={exercises}
      recentWorkouts={recentWorkouts}
      activeWorkout={active?.workout ?? null}
      activeSets={active?.sets ?? []}
    />
  );
}
