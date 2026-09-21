import { useSearchParams } from "@/app/navigation";
import { WorkoutPageClient } from "@/app/sections/workout/workout-page-client";
import { RecordsPageClient } from "@/app/sections/workout/records-page-client";

export function WorkoutRoute() {
  const params = useSearchParams();
  return <WorkoutPageClient activeWorkoutId={params.get("active")?.trim() || null} />;
}

export function RecordsRoute() {
  return <RecordsPageClient />;
}
