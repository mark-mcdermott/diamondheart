"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createEntry } from "@/app/actions/tracker";
import type { TrackerMetric } from "@/db/schema";
import { ArrowLeft, Save } from "lucide-react";

interface EntryClientProps {
  metrics: TrackerMetric[];
}

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

export function EntryClient({ metrics }: EntryClientProps) {
  const [selectedMetricId, setSelectedMetricId] = useState("");
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedMetric = metrics.find((m) => m.id === selectedMetricId);

  const now = new Date();
  const defaultDate = now.toISOString().split("T")[0];
  const defaultTime = now.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  const canSubmit =
    selectedMetricId &&
    (selectedMetric?.valueType === "none" || value) &&
    !isPending;

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

      {metrics.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground mb-4">
            No metrics set up yet. Create some metrics first.
          </p>
          <Button variant="outline" asChild>
            <Link href="/metrics">Set Up Tracker</Link>
          </Button>
        </div>
      ) : (
        <form
          action={(formData) => {
            startTransition(() => createEntry(formData));
          }}
          className="space-y-6"
        >
          {/* Metric Selection */}
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
              {metrics.map((metric) => (
                <option key={metric.id} value={metric.id}>
                  {metric.name}
                  {metric.unit ? ` (${metric.unit})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Value Input */}
          {selectedMetric && selectedMetric.valueType !== "none" && (
            <div>
              <Label htmlFor="value">
                Value
                {selectedMetric.unit && (
                  <span className="text-muted-foreground font-normal ml-1">
                    ({selectedMetric.unit})
                  </span>
                )}
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
                  <span className="text-sm text-muted-foreground">
                    {value === "true" ? "Yes" : "No"}
                  </span>
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
                  placeholder={
                    selectedMetric.valueType === "int"
                      ? "0"
                      : selectedMetric.valueType === "float"
                        ? "0.00"
                        : "Enter value"
                  }
                  className="mt-2"
                />
              )}
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                type="date"
                id="date"
                name="date"
                defaultValue={defaultDate}
                className="mt-2 cursor-pointer"
              />
            </div>
            <div>
              <Label htmlFor="time">Time</Label>
              <Input
                type="time"
                id="time"
                name="time"
                defaultValue={defaultTime}
                className="mt-2 cursor-pointer"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Any additional notes..."
              className="mt-2 resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={!canSubmit}>
              <Save className="w-4 h-4 mr-2" />
              {isPending ? "Saving..." : "Save Entry"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Cancel</Link>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
