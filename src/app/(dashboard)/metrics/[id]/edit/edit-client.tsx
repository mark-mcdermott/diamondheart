"use client";

import { useState, useTransition } from "react";
import { VALUE_TYPES } from "@/lib/metric-types";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateMetric } from "@/app/actions/tracker";
import type { TrackerMetric } from "@/db/schema";
import { ArrowLeft, Save } from "lucide-react";

interface MetricEditClientProps {
  metric: TrackerMetric;
}

export function MetricEditClient({ metric }: MetricEditClientProps) {
  const [name, setName] = useState(metric.name);
  const [valueType, setValueType] = useState(metric.valueType);
  const [unit, setUnit] = useState(metric.unit || "");
  const [dailyGoal, setDailyGoal] = useState(String(metric.dailyGoal ?? 1));
  const [counter, setCounter] = useState(metric.counter);
  const [singleValuePerDay, setSingleValuePerDay] = useState(metric.singleValuePerDay);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", name);
      fd.set("valueType", valueType);
      fd.set("unit", unit);
      fd.set("dailyGoal", dailyGoal);
      fd.set("counter", String(counter));
      fd.set("singleValuePerDay", String(singleValuePerDay));
      await updateMetric(metric.id, fd);
    });
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href={`/metrics/${metric.id}`}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2>Edit {metric.name}</h2>
      </div>

      <div className="space-y-6">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="valueType">Type</Label>
          <select
            id="valueType"
            value={valueType}
            onChange={(e) => setValueType(e.target.value)}
            className="mt-2 w-full px-3 py-2 border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {VALUE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="unit">Unit (optional)</Label>
          <Input
            id="unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="e.g. kg, min, glasses"
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="dailyGoal">Daily Goal</Label>
          <Input
            id="dailyGoal"
            type="number"
            min={1}
            value={dailyGoal}
            onChange={(e) => setDailyGoal(e.target.value)}
            className="mt-2"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="counter"
            checked={counter}
            onChange={(e) => {
              setCounter(e.target.checked);
              if (e.target.checked) setSingleValuePerDay(false);
            }}
            className="w-5 h-5 rounded border-border cursor-pointer"
          />
          <Label htmlFor="counter" className="cursor-pointer">
            Counter (tap + to add 1 each time)
          </Label>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="singleValuePerDay"
            checked={singleValuePerDay}
            onChange={(e) => {
              setSingleValuePerDay(e.target.checked);
              if (e.target.checked) setCounter(false);
            }}
            className="w-5 h-5 rounded border-border cursor-pointer"
          />
          <Label htmlFor="singleValuePerDay" className="cursor-pointer">
            One reading per day (logging again replaces it, like weight)
          </Label>
        </div>

        <div className="flex gap-3 pt-4">
          <Button onClick={handleSubmit} disabled={!name || isPending}>
            <Save className="w-4 h-4 mr-2" />
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
          <Button variant="secondary" asChild>
            <Link href={`/metrics/${metric.id}`}>Cancel</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
