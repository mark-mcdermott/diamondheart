import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { trackerMetrics, trackerEntries } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil } from "lucide-react";

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

  function formatValue(value: string, valueType: string): string {
    if (valueType === "none") return "Done";
    if (valueType === "bool") return value === "true" ? "Yes" : "No";
    return value;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/metrics" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h2>{metric.name}</h2>
          <p className="text-muted-foreground mt-1">
            {metric.valueType}
            {metric.unit ? ` (${metric.unit})` : ""} &middot; Daily goal:{" "}
            {metric.dailyGoal ?? 1}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/metrics/${id}/edit`}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>

      {entries.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground mb-4">No entries recorded yet.</p>
          <Button asChild>
            <Link href="/entry">Log Entry</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Time</th>
                  <th className="text-left px-4 py-3 font-medium">Value</th>
                  <th className="text-left px-4 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry) => {
                  const d = new Date(entry.date);
                  return (
                    <tr key={entry.id}>
                      <td className="px-4 py-3">
                        {d.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {d.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        {formatValue(entry.value, metric.valueType)}
                        {metric.unit && (
                          <span className="text-muted-foreground ml-1">
                            {metric.unit}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {entry.notes || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </p>
        </>
      )}
    </div>
  );
}
