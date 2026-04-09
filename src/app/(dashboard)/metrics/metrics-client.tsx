"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addMetric,
  deleteMetric,
  toggleHidden,
} from "@/app/actions/tracker";
import type { TrackerCategory, TrackerMetric } from "@/db/schema";
import {
  ArrowLeft,
  Plus,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  GripVertical,
} from "lucide-react";

interface MetricsClientProps {
  categories: TrackerCategory[];
  metrics: TrackerMetric[];
}

const VALUE_TYPES = [
  { value: "none", label: "None (just log it)" },
  { value: "int", label: "Integer" },
  { value: "float", label: "Decimal" },
  { value: "text", label: "Text" },
  { value: "bool", label: "Yes/No" },
];

export function MetricsClient({ metrics: initialMetrics }: MetricsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("none");
  const [newUnit, setNewUnit] = useState("");
  const [newGoal, setNewGoal] = useState("1");

  function handleAdd() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", newName);
      fd.set("valueType", newType);
      fd.set("unit", newUnit);
      fd.set("dailyGoal", newGoal);
      const result = await addMetric(fd);
      if (result.success) {
        setNewName("");
        setNewType("none");
        setNewUnit("");
        setNewGoal("1");
        setShowAddForm(false);
      }
    });
  }

  function handleDelete(metricId: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("metricId", metricId);
      await deleteMetric(fd);
    });
  }

  function handleToggleHidden(metricId: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("metricId", metricId);
      await toggleHidden(fd);
    });
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h2>Metrics</h2>
          <p className="text-muted-foreground mt-1">Manage your tracking metrics</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Metric
        </Button>
      </div>

      {/* Add Metric Form */}
      {showAddForm && (
        <div className="border border-border rounded-lg p-6 mb-8 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Water intake"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {VALUE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Unit (optional)</label>
              <Input
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                placeholder="e.g. glasses, min, kg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Daily Goal</label>
              <Input
                type="number"
                min={1}
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleAdd} disabled={!newName || isPending}>
              {isPending ? "Saving..." : "Save Metric"}
            </Button>
            <Button variant="outline" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Metrics List */}
      {initialMetrics.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground mb-4">
            No metrics yet. Add your first metric to start tracking.
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg divide-y divide-border">
          {initialMetrics.map((metric) => (
            <div
              key={metric.id}
              className="flex items-center gap-4 px-4 py-3"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />

              <button
                onClick={() => handleToggleHidden(metric.id)}
                className="text-muted-foreground hover:text-foreground"
                title={metric.hidden ? "Show metric" : "Hide metric"}
              >
                {metric.hidden ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <Link
                  href={`/metrics/${metric.id}`}
                  className="text-sm font-medium hover:underline"
                >
                  {metric.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {metric.valueType}
                  {metric.unit ? ` (${metric.unit})` : ""} &middot; Goal:{" "}
                  {metric.dailyGoal ?? 1}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/metrics/${metric.id}/edit`}>
                    <Pencil className="w-4 h-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(metric.id)}
                  disabled={isPending}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
