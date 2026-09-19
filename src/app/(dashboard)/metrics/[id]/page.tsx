import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { trackerMetrics, trackerEntries } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import Link from "next/link";
import { EntriesTable } from "./entries-table";
import { MetricChart } from "./metric-chart";
import { ArrowLeft } from "lucide-react";
import { getUserPreferences } from "@/app/actions/preferences";
import { displayUnitFor, toDisplayValue, roundMass } from "@/lib/units";

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
    .where(and(eq(trackerMetrics.id, id), eq(trackerMetrics.userId, session.userId)))
    .limit(1);

  if (!metric) notFound();

  const { weightUnit } = await getUserPreferences(session.userId);
  const displayUnit = displayUnitFor(metric.unit, weightUnit);

  // Readings are stored in the metric's unit; show them in the viewer's.
  const forDisplay = (raw: string): string => {
    const n = parseFloat(raw);
    if (Number.isNaN(n)) return raw;
    const shown = toDisplayValue(n, metric.unit, weightUnit);
    return String(shown === n ? n : roundMass(shown));
  };

  const entries = await db
    .select()
    .from(trackerEntries)
    .where(
      and(
        eq(trackerEntries.metricId, id),
        eq(trackerEntries.userId, session.userId)
      )
    )
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
            {metric.dailyGoal
              ? `Daily goal: ${metric.dailyGoal}${metric.unit ? ` ${metric.unit}` : ""}`
              : displayUnit ?? "No daily goal"}
          </p>
        </div>
      </div>

      {entries.length > 0 && (
        <MetricChart
          entries={entries.map((e) => ({
            value: forDisplay(e.value),
            date: e.date.toISOString(),
          }))}
          valueType={metric.valueType}
          unit={displayUnit}
          dailyGoal={metric.dailyGoal}
        />
      )}

      <EntriesTable
        metricId={metric.id}
        entries={entries.map((e) => ({
          id: e.id,
          value: forDisplay(e.value),
          notes: e.notes,
          date: e.date.toISOString(),
        }))}
        valueType={metric.valueType}
        unit={displayUnit}
      />
      {entries.length > 0 && (
        <p className="text-sm text-muted-foreground mt-4">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </p>
      )}
    </div>
  );
}
