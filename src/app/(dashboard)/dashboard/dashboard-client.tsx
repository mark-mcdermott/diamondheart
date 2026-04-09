"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/progress-ring";
import { quickLog } from "@/app/actions/tracker";
import type { TrackerMetric } from "@/db/schema";
import {
  Plus,
  Settings,
  Check,
  Brain,
  Droplets,
  Dumbbell,
  Heart,
  Flame,
  BookOpen,
  Moon,
  Sun,
  Apple,
  Footprints,
  Clock,
  type LucideIcon,
} from "lucide-react";

interface Entry {
  id: string;
  metricId: string;
  value: string;
  date: string;
}

interface DashboardClientProps {
  metrics: TrackerMetric[];
  todayEntries: Entry[];
  recentEntries: Entry[];
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

export function DashboardClient({ metrics, todayEntries, recentEntries }: DashboardClientProps) {
  const [isPending, startTransition] = useTransition();

  const completedCount = metrics.filter((m) => isGoalMet(m, todayEntries)).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const recentNonToday = recentEntries
    .filter((e) => new Date(e.date) < today)
    .slice(0, 8);

  function handleQuickLog(metricId: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("metricId", metricId);
      fd.set("value", "done");
      await quickLog(fd);
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
          {/* Today's Progress */}
          <section className="mb-12">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-5">
              Today&apos;s Progress
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {metrics.map((metric, index) => {
                const MetricIcon = getMetricIcon(metric, index);
                const progress = getProgress(metric, todayEntries);
                const color = getMetricColorHex(metric, index);
                const completed = isGoalMet(metric, todayEntries);

                return (
                  <Link
                    key={metric.id}
                    href={`/metrics/${metric.id}`}
                    className="group bg-card rounded-lg p-5 flex flex-col items-center gap-3 hover:opacity-90 transition-opacity no-underline"
                  >
                    <ProgressRing
                      value={progress}
                      size={64}
                      strokeWidth={5}
                      color={completed ? "#22c55e" : color}
                      trackColor="var(--color-muted)"
                    >
                      {completed ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <MetricIcon className="w-5 h-5 text-muted-foreground" />
                      )}
                    </ProgressRing>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">{metric.name}</p>
                      <p className="text-sm font-medium mt-0.5">
                        {formatTodayDisplay(metric, todayEntries)}
                        {metric.unit && (
                          <span className="text-muted-foreground font-normal ml-1">
                            {metric.unit}
                          </span>
                        )}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Quick Log */}
          <section className="mb-12">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-5">
              Quick Log
            </h3>
            <div className="space-y-2">
              {metrics.map((metric, index) => {
                const MetricIcon = getMetricIcon(metric, index);
                const completed = isGoalMet(metric, todayEntries);

                return (
                  <div
                    key={metric.id}
                    className="flex items-center justify-between py-3 px-4 rounded-lg bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <MetricIcon className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm font-medium">{metric.name}</span>
                      {completed && <Check className="w-4 h-4 text-green-500" />}
                    </div>
                    <Button
                      size="sm"
                      variant={completed ? "outline" : "default"}
                      disabled={isPending}
                      onClick={() => handleQuickLog(metric.id)}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Log
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
                        <span className="text-sm">
                          {metric?.name ?? "Unknown"}
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
    </div>
  );
}
