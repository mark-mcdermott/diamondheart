import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { reminderSchedules, trackerMetrics } from "@/db/schema";
import { eq } from "drizzle-orm";
import { RemindersClient } from "./reminders-client";

export default async function RemindersPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const reminders = await db
    .select()
    .from(reminderSchedules)
    .where(eq(reminderSchedules.userId, session.userId));

  const metrics = await db
    .select({ id: trackerMetrics.id, name: trackerMetrics.name })
    .from(trackerMetrics)
    .where(eq(trackerMetrics.archived, false))
    .orderBy(trackerMetrics.name);

  return (
    <RemindersClient
      reminders={reminders.map((r) => ({
        ...r,
        days: r.days as number[],
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }))}
      metrics={metrics}
    />
  );
}
