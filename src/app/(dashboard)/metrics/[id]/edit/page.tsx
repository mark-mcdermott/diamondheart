import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { trackerMetrics } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { MetricEditClient } from "./edit-client";

export default async function MetricEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const { id } = await params;

  const [metric] = await db
    .select()
    .from(trackerMetrics)
    .where(and(eq(trackerMetrics.id, id), eq(trackerMetrics.userId, session.userId)))
    .limit(1);

  if (!metric) notFound();

  return <MetricEditClient metric={metric} />;
}
