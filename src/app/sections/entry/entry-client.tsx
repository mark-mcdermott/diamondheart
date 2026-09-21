"use client";

import { useState } from "react";
import { Link } from "@/app/link";
import { useRouter } from "@/app/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, errorMessage, keys } from "@/app/api";
import { localDateTimeToISO } from "@/lib/dates";
import { displayUnitFor } from "@/lib/units";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save } from "lucide-react";

function getInputType(valueType: string): string {
  switch (valueType) {
    case "int":
    case "float":
      return "number";
    case "bool":
      return "checkbox";
    default:
      return "text";
  }
}

function getInputStep(valueType: string): string | undefined {
  if (valueType === "float") return "0.01";
  if (valueType === "int") return "1";
  return undefined;
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2>Log Entry</h2>
          <p className="text-muted-foreground mt-1">Record a new metric entry</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export function EntryClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const metrics = useQuery({ queryKey: keys.metrics, queryFn: api.metrics.list });
  const preferences = useQuery({ queryKey: keys.preferences, queryFn: api.preferences.get });

  const [selectedMetricId, setSelectedMetricId] = useState("");
  const [value, setValue] = useState("");

  const now = new Date();
  const [date, setDate] = useState(() => {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [time, setTime] = useState(() => now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }));
  const [notes, setNotes] = useState("");

  const save = useMutation({
    mutationFn: () => {
      const iso = localDateTimeToISO(date, time);
      if (!iso) return Promise.reject(new Error("Pick a valid date and time"));
      return api.entries.create(selectedMetricId, {
        value: value || "done",
        date: iso,
        notes: notes.trim() || null,
        unit: preferences.data?.weightUnit,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.metric(selectedMetricId) });
      router.push("/dashboard");
    },
    onError: (error) => toast.error(error instanceof Error && !("status" in error) ? error.message : errorMessage(error)),
  });

  if (metrics.isPending || preferences.isPending) {
    return (
      <Frame>
        <div className="space-y-6" aria-busy="true" aria-label="Loading metrics">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 rounded-lg border border-border bg-card animate-pulse" />
          ))}
        </div>
      </Frame>
    );
  }

  if (metrics.isError || preferences.isError) {
    return (
      <Frame>
        <div className="rounded-lg border border-border bg-card px-4 py-6 text-center">
          <p className="text-sm font-medium">Your metrics could not be loaded</p>
          <p className="text-xs text-muted-foreground mt-1">{errorMessage(metrics.error ?? preferences.error)}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              void metrics.refetch();
              void preferences.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      </Frame>
    );
  }

  // Label the input in the unit the user thinks in; the API converts on write.
  const { weightUnit } = preferences.data;
  const labelled = metrics.data.map((m) => ({ ...m, unit: displayUnitFor(m.unit, weightUnit) }));
  const selectedMetric = labelled.find((m) => m.id === selectedMetricId);
  const canSubmit = selectedMetricId && (selectedMetric?.valueType === "none" || value) && !save.isPending;

  return (
    <Frame>
      {labelled.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground mb-4">No metrics set up yet. Create some metrics first.</p>
          <Button variant="outline" asChild>
            <Link href="/metrics">Set Up Tracker</Link>
          </Button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) save.mutate();
          }}
          className="space-y-6"
        >
          <div>
            <Label htmlFor="metricId">Metric</Label>
            <select
              id="metricId"
              name="metricId"
              value={selectedMetricId}
              onChange={(e) => setSelectedMetricId(e.target.value)}
              required
              className="mt-2 w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              <option value="">Select a metric...</option>
              {labelled.map((metric) => (
                <option key={metric.id} value={metric.id}>
                  {metric.name}
                  {metric.unit ? ` (${metric.unit})` : ""}
                </option>
              ))}
            </select>
          </div>

          {selectedMetric && selectedMetric.valueType !== "none" && (
            <div>
              <Label htmlFor="value">
                Value
                {selectedMetric.unit && <span className="text-muted-foreground font-normal ml-1">({selectedMetric.unit})</span>}
              </Label>
              {selectedMetric.valueType === "bool" ? (
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="value"
                    name="value"
                    checked={value === "true"}
                    onChange={(e) => setValue(e.target.checked ? "true" : "false")}
                    className="w-5 h-5 rounded border-border cursor-pointer"
                  />
                  <span className="text-sm text-muted-foreground">{value === "true" ? "Yes" : "No"}</span>
                </div>
              ) : (
                <Input
                  type={getInputType(selectedMetric.valueType)}
                  step={getInputStep(selectedMetric.valueType)}
                  id="value"
                  name="value"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  required
                  placeholder={selectedMetric.valueType === "int" ? "0" : selectedMetric.valueType === "float" ? "0.00" : "Enter value"}
                  className="mt-2"
                />
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input type="date" id="date" name="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-2 cursor-pointer" />
            </div>
            <div>
              <Label htmlFor="time">Time</Label>
              <Input type="time" id="time" name="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-2 cursor-pointer" />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea id="notes" name="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes..." className="mt-2 resize-none" />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={!canSubmit}>
              <Save className="w-4 h-4 mr-2" />
              {save.isPending ? "Saving..." : "Save Entry"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Cancel</Link>
            </Button>
          </div>
        </form>
      )}
    </Frame>
  );
}
