import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { trackerMetrics } from "@/db/schema";
import { eq } from "drizzle-orm";
import { EntryClient } from "./entry-client";

export default async function EntryPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const metrics = await db
    .select()
    .from(trackerMetrics)
    .where(eq(trackerMetrics.archived, false))
    .orderBy(trackerMetrics.sortOrder);

  return <EntryClient metrics={metrics} />;
}
