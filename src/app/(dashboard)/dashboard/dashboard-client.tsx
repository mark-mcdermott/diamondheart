"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProgressRing } from "@/components/ui/progress-ring";
import { quickLog, createEntry } from "@/app/actions/tracker";
import type { TrackerMetric } from "@/db/schema";
import {
  Plus,
  Settings,
  Check,
  CheckCheck,
  Flame,
  Beef,
  Wheat,
  Droplet,
  Coffee,
  UtensilsCrossed,
  Salad,
  Cookie,
  Brain,
  Droplets,
  Dumbbell,
  Heart,
  BookOpen,
  Moon,
  Sun,
  Apple,
  Footprints,
  Clock,
  type LucideIcon,
} from "lucide-react";

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Entry {
  id: string;
  metricId: string;
  value: string;
  date: string;
}

interface MealSummary {
  count: number;
  calories: number;
}

interface DashboardClientProps {
  metrics: TrackerMetric[];
  todayEntries: Entry[];
  recentEntries: Entry[];
  foodTotals: { calories: number; protein: number; carbs: number; fat: number };
  mealSummaries: Record<string, MealSummary>;
}

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  meditation: Brain,
  water: Droplets,
  exercise: Dumbbell,
  sleep: Moon,
  reading: BookOpen,
  steps: Footprints,
  nutrition: Apple,
  cardio: Flame,
  health: Heart,
  energy: Sun,
};

const fallbackIcons: LucideIcon[] = [
  Heart, Flame, BookOpen, Moon, Sun, Apple, Footprints, Brain, Droplets, Dumbbell,
];

function getMetricIcon(metric: TrackerMetric, index: number): LucideIcon {
  return iconMap[metric.slug] ?? fallbackIcons[index % fallbackIcons.length];
}

// Color mapping
const colorHexMap: Record<string, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  purple: "#a855f7",
  amber: "#f59e0b",
  rose: "#f43f5e",
  cyan: "#06b6d4",
  indigo: "#6366f1",
  emerald: "#10b981",
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  teal: "#14b8a6",
  pink: "#ec4899",
};

const defaultColorCycle = [
  "#3b82f6", "#22c55e", "#a855f7", "#f59e0b",
  "#f43f5e", "#06b6d4", "#6366f1", "#10b981",
];

function getMetricColorHex(metric: TrackerMetric, index: number): string {
  if (metric.color && colorHexMap[metric.color]) {
    return colorHexMap[metric.color];
  }
  return defaultColorCycle[index % defaultColorCycle.length];
}

// Helpers
function getTodayValue(metricId: string, todayEntries: Entry[]): { count: number; sum: number } {
  const entries = todayEntries.filter((e) => e.metricId === metricId);
  let sum = 0;
  for (const entry of entries) {
    const parsed = parseFloat(entry.value);
    if (!isNaN(parsed)) {
      sum += parsed;
    } else {
      sum += 1;
    }
  }
  return { count: entries.length, sum };
}

function formatTodayDisplay(metric: TrackerMetric, todayEntries: Entry[]): string {
  const { count, sum } = getTodayValue(metric.id, todayEntries);
  const goal = metric.dailyGoal ?? 1;

  if (metric.valueType === "none" || metric.valueType === "bool") {
    return `${count}/${goal}`;
  }

  const displayValue = Number.isInteger(sum) ? sum.toString() : sum.toFixed(1);
  const formattedValue = sum >= 1000 ? sum.toLocaleString() : displayValue;
  return `${formattedValue}/${goal}`;
}

function getProgress(metric: TrackerMetric, todayEntries: Entry[]): number {
  const { count, sum } = getTodayValue(metric.id, todayEntries);
  const goal = metric.dailyGoal ?? 1;
  if (goal <= 0) return 100;

  if (metric.valueType === "none" || metric.valueType === "bool") {
    return Math.min(100, (count / goal) * 100);
  }
  return Math.min(100, (sum / goal) * 100);
}

function isGoalMet(metric: TrackerMetric, todayEntries: Entry[]): boolean {
  return getProgress(metric, todayEntries) >= 100;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatTimeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "yesterday";
  return `${diffDay}d ago`;
}

export function DashboardClient({ metrics, todayEntries, recentEntries, foodTotals, mealSummaries }: DashboardClientProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [entryMetric, setEntryMetric] = useState<TrackerMetric | null>(null);
  const [entryValue, setEntryValue] = useState("");
  const [, startTransition] = useTransition();

  const completedCount = metrics.filter((m) => isGoalMet(m, todayEntries)).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const recentNonToday = recentEntries
    .filter((e) => new Date(e.date) < today)
    .slice(0, 8);

  function handleQuickLog(metricId: string) {
    setPendingId(metricId);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("metricId", metricId);
      fd.set("value", "done");
      await quickLog(fd);
      setPendingId(null);
    });
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <p className="text-sm text-muted-foreground mb-1">Today</p>
        <h2>{formatDate(new Date())}</h2>
        <p className="text-sm text-muted-foreground mt-2">
          {completedCount}/{metrics.length} goals completed
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-10">
        <Button asChild>
          <Link href="/entry">
            <Plus className="w-4 h-4 mr-2" />
            Log Entry
          </Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/metrics">
            <Settings className="w-4 h-4 mr-2" />
            Metrics
          </Link>
        </Button>
      </div>

      {metrics.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No metrics yet. Create some to start tracking.
          </p>
          <Button variant="outline" asChild>
            <Link href="/metrics">Set Up Metrics</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Goals */}
          <section className="mb-12">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-5">
              Today&apos;s Goals
            </h3>
            <div className="grid gap-2" style={{ gridTemplateColumns: "auto auto auto 1fr auto auto auto" }}>
              {metrics.filter((m) => !m.counter).map((metric, index) => {
                const MetricIcon = getMetricIcon(metric, index);
                const completed = isGoalMet(metric, todayEntries);
                const { sum, count } = getTodayValue(metric.id, todayEntries);
                const goal = metric.dailyGoal ?? 1;
                const isCountType = metric.valueType === "none" || metric.valueType === "bool";
                const currentValue = isCountType ? count : (Number.isInteger(sum) ? sum : sum.toFixed(1));
                const unit = metric.unit || (isCountType ? "done" : "");

                return (
                  <div key={metric.id} className="col-span-7 grid items-center py-3 px-4 rounded-lg bg-card" style={{ gridTemplateColumns: "subgrid" }}>
                    <div className="flex items-center gap-3">
                      <MetricIcon className="w-5 h-5 text-primary" />
                      <Link href={`/metrics/${metric.id}`} className="text-base font-semibold no-underline hover:opacity-70" style={{ color: "var(--app-heading-color)" }}>{titleCase(metric.name)}</Link>
                    </div>
                    <div className="w-5 flex items-center justify-center">
                      {completed && <Check className="w-4 h-4 text-green-500" />}
                    </div>
                    <span className="text-sm text-muted-foreground">(goal: {goal} {unit})</span>
                    <div className="mx-4">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, getProgress(metric, todayEntries))}%`,
                            backgroundColor: completed ? "#22c55e" : "#a57cf4",
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground text-left mx-2">{currentValue} {unit}</span>
                    <Button
                      size="icon-sm"
                      variant="secondary"
                      disabled={pendingId === metric.id + "-add"}
                      onClick={() => {
                        if (metric.counter) {
                          setPendingId(metric.id + "-add");
                          startTransition(async () => {
                            const fd = new FormData();
                            fd.set("metricId", metric.id);
                            fd.set("value", "1");
                            await quickLog(fd);
                            setPendingId(null);
                          });
                        } else {
                          setEntryMetric(metric);
                          setEntryValue("");
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="default"
                      disabled={pendingId === metric.id}
                      onClick={() => handleQuickLog(metric.id)}
                    >
                      <CheckCheck className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Counters */}
          {(() => {
            const counterMetrics = metrics.filter((m) => m.counter);
            if (counterMetrics.length === 0) return null;
            return (
              <section className="mb-12 -mt-6">
                <h3 className="sr-only">
                  Counters
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {counterMetrics.map((metric, index) => {
                    const MetricIcon = getMetricIcon(metric, index);
                    const { sum, count } = getTodayValue(metric.id, todayEntries);
                    const isCountType = metric.valueType === "none" || metric.valueType === "bool";
                    const currentValue = isCountType ? count : (Number.isInteger(sum) ? sum : sum.toFixed(1));
                    const unit = metric.unit || "";

                    return (
                      <div key={metric.id} className="bg-card rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 inline-flex items-center justify-center rounded-full bg-secondary text-accent shrink-0">
                              <MetricIcon className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-sm font-semibold" style={{ color: "var(--app-heading-color)" }}>{titleCase(metric.name)}</span>
                          </div>
                          <Button
                            size="icon-xs"
                            variant="secondary"
                            disabled={pendingId === metric.id + "-counter"}
                            onClick={() => {
                              setPendingId(metric.id + "-counter");
                              startTransition(async () => {
                                const fd = new FormData();
                                fd.set("metricId", metric.id);
                                fd.set("value", "1");
                                await quickLog(fd);
                                setPendingId(null);
                              });
                            }}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">{currentValue} {unit}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })()}

          {/* Food */}
          <section className="mb-12">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-5">
              Food
            </h3>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: "Calories", value: foodTotals.calories, unit: "kcal", icon: Flame },
                { label: "Protein", value: foodTotals.protein, unit: "g", icon: Beef },
                { label: "Carbs", value: foodTotals.carbs, unit: "g", icon: Wheat },
                { label: "Fat", value: foodTotals.fat, unit: "g", icon: Droplet },
              ].map((item) => (
                <div key={item.label} className="bg-card rounded-lg p-3 text-center">
                  <item.icon className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-lg font-semibold" style={{ color: "var(--app-heading-color)" }}>{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="bg-card rounded-lg divide-y divide-border">
              {[
                { key: "breakfast", label: "Breakfast", icon: Coffee },
                { key: "lunch", label: "Lunch", icon: UtensilsCrossed },
                { key: "dinner", label: "Dinner", icon: Salad },
                { key: "snack", label: "Snack", icon: Cookie },
              ].map((meal) => {
                const summary = mealSummaries[meal.key] || { count: 0, calories: 0 };
                return (
                  <div key={meal.key} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <meal.icon className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold" style={{ color: "var(--app-heading-color)" }}>{meal.label}</span>
                      {summary.count > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {summary.count} {summary.count === 1 ? "item" : "items"} &middot; {summary.calories} cal
                        </span>
                      )}
                    </div>
                    <Button size="icon-xs" variant="secondary" asChild>
                      <Link href="/food">
                        <Plus className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recent Activity */}
          {recentNonToday.length > 0 && (
            <section>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-5">
                Recent Activity
              </h3>
              <div className="space-y-1">
                {recentNonToday.map((entry) => {
                  const metric = metrics.find((m) => m.id === entry.metricId);
                  const entryIndex = metric ? metrics.indexOf(metric) : 0;
                  const EntryIcon = metric
                    ? getMetricIcon(metric, entryIndex)
                    : Clock;

                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between py-2.5 px-4 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <EntryIcon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-base font-semibold" style={{ color: "var(--app-heading-color)" }}>
                          {titleCase(metric?.name ?? "Unknown")}
                        </span>
                        {entry.value && entry.value !== "done" && (
                          <span className="text-sm text-muted-foreground">
                            {entry.value}
                            {metric?.unit ? ` ${metric.unit}` : ""}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(entry.date)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
      {/* Quick Entry Modal */}
      <Dialog open={!!entryMetric} onOpenChange={(open) => { if (!open) setEntryMetric(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log {entryMetric ? titleCase(entryMetric.name) : ""}</DialogTitle>
          </DialogHeader>
          {entryMetric && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                startTransition(async () => {
                  const fd = new FormData();
                  fd.set("metricId", formData.get("metricId") as string);
                  fd.set("value", formData.get("value") as string || "done");
                  await quickLog(fd);
                  setEntryMetric(null);
                  setEntryValue("");
                });
              }}
              className="space-y-4 mt-2"
            >
              <input type="hidden" name="metricId" value={entryMetric.id} />
              <input type="hidden" name="date" value={new Date().toISOString().split("T")[0]} />
              <input type="hidden" name="time" value={new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })} />

              {entryMetric.valueType !== "none" && (
                <div>
                  {entryMetric.valueType === "bool" ? (
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="modal-value"
                        name="value"
                        checked={entryValue === "true"}
                        onChange={(e) => setEntryValue(e.target.checked ? "true" : "false")}
                        className="w-5 h-5 rounded border-border cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground">{entryValue === "true" ? "Yes" : "No"}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 justify-center">
                      <Input
                        type={entryMetric.valueType === "int" || entryMetric.valueType === "float" ? "number" : "text"}
                        step={entryMetric.valueType === "float" ? "0.01" : entryMetric.valueType === "int" ? "1" : undefined}
                        id="modal-value"
                        name="value"
                        value={entryValue}
                        onChange={(e) => setEntryValue(e.target.value)}
                        required
                        autoFocus
                        placeholder="0"
                        className="w-20"
                      />
                      {entryMetric.unit && <span className="text-sm text-muted-foreground">{entryMetric.unit}</span>}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2 justify-end">
                <Button type="submit" disabled={entryMetric.valueType !== "none" && !entryValue}>
                  Save
                </Button>
                <Button type="button" variant="secondary" onClick={() => setEntryMetric(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
