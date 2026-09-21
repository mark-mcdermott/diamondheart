"use client";

import { Link } from "@/app/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api, ApiError, errorMessage, keys } from "@/app/api";
import { Button } from "@/components/ui/button";
import { displayUnitFor, roundMass, toDisplayValue } from "@/lib/units";
import { EntriesTable } from "./entries-table";
import { MetricChart } from "./metric-chart";

const headingStyle = { color: "var(--app-heading-color)" };

function Frame({ title, subtitle, children }: { title: React.ReactNode; subtitle?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/metrics" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h2>{title}</h2>
          {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function NotFound() {
  return (
    <Frame title="Page not found" subtitle="There is no metric at this address, or it is not yours.">
      <Button variant="outline" asChild>
        <Link href="/metrics">Back to metrics</Link>
      </Button>
    </Frame>
  );
}

export function MetricDetailClient({ id }: { id: string }) {
  const detail = useQuery({ queryKey: keys.metric(id), queryFn: () => api.metrics.get(id) });
  const preferences = useQuery({ queryKey: keys.preferences, queryFn: api.preferences.get });

  if (detail.isError && detail.error instanceof ApiError && detail.error.status === 404) return <NotFound />;

  if (detail.isPending || preferences.isPending) {
    return (
      <Frame title={<span className="inline-block h-7 w-40 rounded bg-muted animate-pulse" />}>
        <div className="space-y-4" aria-busy="true" aria-label="Loading metric">
          <div className="h-64 rounded-lg border border-border bg-card animate-pulse" />
          <div className="h-40 rounded-lg border border-border bg-card animate-pulse" />
        </div>
      </Frame>
    );
  }

  if (detail.isError || preferences.isError) {
    return (
      <Frame title="Metric">
        <div className="rounded-lg border border-border bg-card px-4 py-6 text-center">
          <p className="text-sm font-medium" style={headingStyle}>
            This metric could not be loaded
          </p>
          <p className="text-xs text-muted-foreground mt-1">{errorMessage(detail.error ?? preferences.error)}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              void detail.refetch();
              void preferences.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      </Frame>
    );
  }

  const { metric, entries } = detail.data;
  const { weightUnit } = preferences.data;
  const displayUnit = displayUnitFor(metric.unit, weightUnit);

  // Readings are stored in the metric's unit; show them in the viewer's.
  const forDisplay = (raw: string): string => {
    const n = parseFloat(raw);
    if (Number.isNaN(n)) return raw;
    const shown = toDisplayValue(n, metric.unit, weightUnit);
    return String(shown === n ? n : roundMass(shown));
  };

  const displayed = entries.map((e) => ({ id: e.id, value: forDisplay(e.value), notes: e.notes, date: e.date }));

  return (
    <Frame
      title={metric.name}
      subtitle={metric.dailyGoal ? `Daily goal: ${metric.dailyGoal}${metric.unit ? ` ${metric.unit}` : ""}` : (displayUnit ?? "No daily goal")}
    >
      {entries.length > 0 && (
        <MetricChart
          entries={displayed.map((e) => ({ value: e.value, date: e.date }))}
          valueType={metric.valueType}
          unit={displayUnit}
          dailyGoal={metric.dailyGoal}
        />
      )}

      <EntriesTable metricId={metric.id} entries={displayed} valueType={metric.valueType} unit={displayUnit} weightUnit={weightUnit} />

      {entries.length > 0 && (
        <p className="text-sm text-muted-foreground mt-4">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </p>
      )}
    </Frame>
  );
}
