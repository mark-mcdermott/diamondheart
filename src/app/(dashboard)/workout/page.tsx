import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { WorkoutPageClient } from "./workout-page-client";

/** Reads `GET /api/workout` from the browser (docs/PORT-PLAN.md, Phase 3). */
export default async function WorkoutPage({
  searchParams,
}: {
  searchParams: Promise<{ active?: string }>;
}) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const { active } = await searchParams;
  return <WorkoutPageClient activeWorkoutId={active?.trim() || null} />;
}
