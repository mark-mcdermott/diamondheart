"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError, errorMessage, keys, type Metric, type MetricDetail } from "@/app/api";
import { VALUE_TYPES } from "@/lib/metric-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save } from "lucide-react";

export function MetricEditClient({ id }: { id: string }) {
  const detail = useQuery({ queryKey: keys.metric(id), queryFn: () => api.metrics.get(id) });

  if (detail.isPending) {
    return (
      <div className="max-w-2xl mx-auto" aria-busy="true" aria-label="Loading metric">
        <div className="h-7 w-48 rounded bg-muted animate-pulse mb-8" />
        <div className="space-y-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-lg border border-border bg-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (detail.isError) {
    const missing = detail.error instanceof ApiError && detail.error.status === 404;
    return (
      <div className="max-w-2xl mx-auto">
        <h2>{missing ? "Page not found" : "Metric could not be loaded"}</h2>
        <p className="text-muted-foreground mt-2">{missing ? "There is no metric at this address, or it is not yours." : errorMessage(detail.error)}</p>
        <Button variant="outline" className="mt-6" asChild>
          <Link href="/metrics">Back to metrics</Link>
        </Button>
      </div>
    );
  }

  return <MetricEditForm metric={detail.data.metric} />;
}

function MetricEditForm({ metric }: { metric: Metric }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState(metric.name);
  const [valueType, setValueType] = useState(metric.valueType);
  const [unit, setUnit] = useState(metric.unit || "");
  const [dailyGoal, setDailyGoal] = useState(String(metric.dailyGoal ?? 1));
  const [counter, setCounter] = useState(metric.counter);
  const [singleValuePerDay, setSingleValuePerDay] = useState(metric.singleValuePerDay);

  const save = useMutation({
    mutationFn: () => {
      const goal = Number.parseInt(dailyGoal, 10);
      return api.metrics.update(metric.id, {
        name: name.trim(),
        valueType,
        unit: unit.trim() || null,
        dailyGoal: Number.isInteger(goal) && goal >= 1 ? goal : 1,
        counter,
        singleValuePerDay,
      });
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<MetricDetail>(keys.metric(metric.id), (current) => (current ? { ...current, metric: saved } : current));
      void queryClient.invalidateQueries({ queryKey: keys.metricsOverview });
      void queryClient.invalidateQueries({ queryKey: keys.metrics });
      router.push(`/metrics/${metric.id}`);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/metrics/${metric.id}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2>Edit {metric.name}</h2>
      </div>

      <div className="space-y-6">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-2" />
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
          <Input id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. kg, min, glasses" className="mt-2" />
        </div>

        <div>
          <Label htmlFor="dailyGoal">Daily Goal</Label>
          <Input id="dailyGoal" type="number" min={1} value={dailyGoal} onChange={(e) => setDailyGoal(e.target.value)} className="mt-2" />
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
          <Button onClick={() => save.mutate()} disabled={!name.trim() || save.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {save.isPending ? "Saving..." : "Save Changes"}
          </Button>
          <Button variant="secondary" asChild>
            <Link href={`/metrics/${metric.id}`}>Cancel</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
