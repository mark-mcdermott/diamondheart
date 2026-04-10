import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { trackerCategories, trackerMetrics } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MetricsClient } from "./metrics-client";
import { getCategoryNavStatus } from "@/app/actions/nav";

export default async function MetricsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const categories = await db
    .select()
    .from(trackerCategories)
    .orderBy(trackerCategories.sortOrder);

  const metrics = await db
    .select()
    .from(trackerMetrics)
    .where(eq(trackerMetrics.archived, false))
    .orderBy(trackerMetrics.sortOrder);

  const categoryNavStatus = await getCategoryNavStatus(
    session.userId,
    categories.map((c) => c.id)
  );

  return (
    <MetricsClient
      categories={categories}
      metrics={metrics}
      categoryNavStatus={categoryNavStatus}
    />
  );
}
