import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { trackerMetrics, trackerEntries } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { EntriesTable } from "./entries-table";
import { MetricChart } from "./metric-chart";
import { ArrowLeft } from "lucide-react";

export default async function MetricDetailPage({
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
    .where(eq(trackerMetrics.id, id))
    .limit(1);

  if (!metric) notFound();

  const entries = await db
    .select()
    .from(trackerEntries)
    .where(eq(trackerEntries.metricId, id))
    .orderBy(desc(trackerEntries.date));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/metrics" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h2>{metric.name}</h2>
          <p className="text-muted-foreground mt-1">
            Daily goal: {metric.dailyGoal ?? 1}{metric.unit ? ` ${metric.unit}` : ""}
          </p>
        </div>
      </div>

      {entries.length > 0 && (
        <MetricChart
          entries={entries.map((e) => ({
            value: e.value,
            date: e.date.toISOString(),
          }))}
          valueType={metric.valueType}
          unit={metric.unit}
          dailyGoal={metric.dailyGoal}
        />
      )}

      <EntriesTable
        metricId={metric.id}
        entries={entries.map((e) => ({
          id: e.id,
          value: e.value,
          notes: e.notes,
          date: e.date.toISOString(),
        }))}
        valueType={metric.valueType}
        unit={metric.unit}
      />
      {entries.length > 0 && (
        <p className="text-sm text-muted-foreground mt-4">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </p>
      )}
    </div>
  );
}
