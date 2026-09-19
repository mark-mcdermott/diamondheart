import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { trackerMetrics } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { EntryClient } from "./entry-client";
import { getUserPreferences } from "@/app/actions/preferences";
import { displayUnitFor } from "@/lib/units";

export default async function EntryPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const metrics = await db
    .select()
    .from(trackerMetrics)
    .where(
      and(
        eq(trackerMetrics.userId, session.userId),
        eq(trackerMetrics.archived, false)
      )
    )
    .orderBy(trackerMetrics.sortOrder);

  // Label the input in the unit the user thinks in; the action converts on write.
  const { weightUnit } = await getUserPreferences(session.userId);
  const labelled = metrics.map((m) => ({
    ...m,
    unit: displayUnitFor(m.unit, weightUnit),
  }));

  return <EntryClient metrics={labelled} />;
}
