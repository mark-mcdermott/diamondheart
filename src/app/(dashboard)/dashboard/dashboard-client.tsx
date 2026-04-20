"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { DatePickerCalendar } from "@/components/ui/date-picker-calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProgressRing } from "@/components/ui/progress-ring";
import { EmptyState } from "@/components/ui/empty-state";
import { quickLog } from "@/app/actions/tracker";
import { WeeklyChart } from "./weekly-chart";
import type { TrackerMetric } from "@/db/schema";
import {
  Plus,
  Settings,
  Check,
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
  ChevronRight,
  ChevronLeft,
  Calendar,
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
  sparklines: Record<string, { date: string; value: number }[]>;
  dashboardSections: string[];
  selectedDate: string;
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

function getProgress(metric: TrackerMetric, todayEntries: Entry[]): number {
  const { count, sum } = getTodayValue(metric.id, todayEntries);
  const goal = metric.dailyGoal ?? 1;
  if (goal <= 0) return 100;

  if (metric.valueType === "none" || metric.valueType === "bool") {
    return Math.max(0, Math.min(100, (count / goal) * 100));
  }
  return Math.max(0, Math.min(100, (sum / goal) * 100));
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

// Build 7-day sparkline data for a metric from recent entries
function buildSparkline(metricId: string, recentEntries: Entry[]): number[] {
  const days: number[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const dayEntries = recentEntries.filter((e) => {
      const d = new Date(e.date);
      return e.metricId === metricId && d >= day && d < nextDay;
    });
    let sum = 0;
    for (const entry of dayEntries) {
      const parsed = parseFloat(entry.value);
      sum += isNaN(parsed) ? 1 : parsed;
    }
    days.push(sum);
  }
  return days;
}

// Mini sparkline SVG
function InlineSparkline({ data, color, completed }: { data: number[]; color: string; completed: boolean }) {
  const max = Math.max(...data, 1);
  const h = 28;
  const w = 64;
  const step = w / (data.length - 1);
  const strokeColor = completed ? "var(--app-success)" : color;

  const points = data.map((v, i) => ({
    x: i * step,
    y: h - (v / max) * (h - 4) - 2,
  }));

  const pathD = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");

  // Area fill
  const areaD = `${pathD} L ${w} ${h} L 0 ${h} Z`;

  return (
    <svg width={w} height={h} className="shrink-0" viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#spark-${color.replace("#", "")})`} />
      <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Current day dot */}
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3" fill={strokeColor} />
    </svg>
  );
}

export function DashboardClient({ metrics, todayEntries, recentEntries, foodTotals, mealSummaries, sparklines, dashboardSections, selectedDate }: DashboardClientProps) {
  const router = useRouter();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [entryMetric, setEntryMetric] = useState<TrackerMetric | null>(null);
  const [entryValue, setEntryValue] = useState("");
  const [, startTransition] = useTransition();
  const [settledIds, setSettledIds] = useState<Set<string>>(new Set());

  const [year, month, day] = selectedDate.split("-").map(Number);
  const viewDate = new Date(year, month - 1, day);
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const isToday = viewDate.getTime() === todayMidnight.getTime();
  const isFuture = viewDate > todayMidnight;
  const yesterdayMidnight = new Date(todayMidnight);
  yesterdayMidnight.setDate(yesterdayMidnight.getDate() - 1);
  const isYesterday = viewDate.getTime() === yesterdayMidnight.getTime();

  function navDate(offset: number) {
    const d = new Date(viewDate);
    d.setDate(d.getDate() + offset);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    router.push(`/dashboard?date=${iso}`);
  }

  function handleDatePick(dateISO: string) {
    setCalendarOpen(false);
    if (dateISO) router.push(`/dashboard?date=${dateISO}`);
    else router.push("/dashboard");
  }

  const dateLabel = isToday ? "Today" : isYesterday ? "Yesterday" : formatDate(viewDate).split(",")[0];

  const completedCount = metrics.filter((m) => isGoalMet(m, todayEntries)).length;
  const overallProgress = metrics.length > 0
    ? Math.round(metrics.reduce((sum, m) => sum + getProgress(m, todayEntries), 0) / metrics.length)
    : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const recentNonToday = recentEntries
    .filter((e) => new Date(e.date) < today)
    .slice(0, 8);

  const goalMetrics = metrics.filter((m) => !m.counter);
  const counterMetrics = metrics.filter((m) => m.counter);

  function handleQuickLog(metricId: string) {
    setPendingId(metricId);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("metricId", metricId);
      fd.set("value", "done");
      await quickLog(fd);
      // Trigger settle animation
      setSettledIds((prev) => new Set(prev).add(metricId));
      setTimeout(() => setSettledIds((prev) => {
        const next = new Set(prev);
        next.delete(metricId);
        return next;
      }), 400);
      setPendingId(null);
    });
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header with progress ring */}
      <div className="flex items-start justify-between mb-10 fade-section">
        <div>
          <p className="text-sm text-muted-foreground font-medium mb-1 tracking-wide uppercase" style={{ fontSize: "11px", letterSpacing: "0.08em" }}>
            {dateLabel}
          </p>
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => navDate(-1)}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer -translate-y-[7px]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-3xl sm:text-4xl font-display leading-none" style={{ fontWeight: 500 }}>
              {formatDate(viewDate)}
            </h2>
            <button
              type="button"
              onClick={() => navDate(1)}
              disabled={isFuture || isToday}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default disabled:hover:bg-transparent -translate-y-[7px]"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer ml-1 -translate-y-[7px]"
                >
                  <Calendar className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" sideOffset={8}>
                <DatePickerCalendar
                  value={selectedDate}
                  max={`${todayMidnight.getFullYear()}-${String(todayMidnight.getMonth() + 1).padStart(2, "0")}-${String(todayMidnight.getDate()).padStart(2, "0")}`}
                  onChange={handleDatePick}
                />
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-sm text-muted-foreground">
            {completedCount} of {metrics.length} practices complete
          </p>
        </div>
        <div className="shrink-0 ml-6">
          <ProgressRing
            value={overallProgress}
            size={88}
            strokeWidth={7}
            color={overallProgress >= 100 ? "var(--app-success)" : "var(--app-primary)"}
            trackColor="var(--app-secondary)"
          >
            <span className="text-lg font-mono font-semibold" style={{ color: "var(--app-heading-color)" }}>
              {overallProgress}%
            </span>
          </ProgressRing>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-10 fade-section" style={{ animationDelay: "60ms" }}>
        <Button asChild>
          <Link href="/entry">
            <Plus className="w-4 h-4 mr-1.5" />
            Log Entry
          </Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/metrics">
            <Settings className="w-4 h-4 mr-1.5" />
            Metrics
          </Link>
        </Button>
      </div>

      {metrics.length === 0 ? (
        <EmptyState
          showIllustration
          title="Begin your practice"
          description="Create some metrics to start tracking your daily habits and wellness goals."
          actionLabel="Set Up Metrics"
          actionHref="/metrics"
        />
      ) : (
        <>
          {/* Goal Cards */}
          {dashboardSections.includes("goals") && <section className="mb-12 fade-section" style={{ animationDelay: "120ms" }}>
            <h3 className="text-xs font-medium text-muted-foreground uppercase mb-5" style={{ letterSpacing: "0.1em" }}>
              Today&apos;s Goals
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger-children">
              {goalMetrics.map((metric, index) => {
                const MetricIcon = getMetricIcon(metric, index);
                const completed = isGoalMet(metric, todayEntries);
                const { sum, count } = getTodayValue(metric.id, todayEntries);
                const goal = metric.dailyGoal ?? 1;
                const isCountType = metric.valueType === "none" || metric.valueType === "bool";
                const currentValue = isCountType ? count : (Number.isInteger(sum) ? sum : sum.toFixed(1));
                const unit = metric.unit || (isCountType ? "" : "");
                const progress = getProgress(metric, todayEntries);
                const sparkData = buildSparkline(metric.id, recentEntries);
                const isSettling = settledIds.has(metric.id);

                return (
                  <div
                    key={metric.id}
                    className={`
                      relative bg-card rounded-2xl border border-border p-4 card-texture
                      transition-all duration-300
                      ${completed ? "goal-completed" : ""}
                      ${isSettling ? "animate-settle" : ""}
                    `}
                  >
                    {/* Top row: icon, name, sparkline */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`
                          w-9 h-9 rounded-xl flex items-center justify-center shrink-0
                          ${completed ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground"}
                          transition-colors duration-500
                        `}>
                          {completed
                            ? <Check className="w-4.5 h-4.5" strokeWidth={2.5} />
                            : <MetricIcon className="w-4.5 h-4.5" />
                          }
                        </div>
                        <div>
                          <Link
                            href={`/metrics/${metric.id}`}
                            className="text-sm font-semibold no-underline hover:opacity-70 block"
                            style={{ color: "var(--app-heading-color)" }}
                          >
                            {titleCase(metric.name)}
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            goal: {goal} {unit}
                          </span>
                        </div>
                      </div>
                      <InlineSparkline data={sparkData} color="var(--app-primary)" completed={completed} />
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min(100, progress)}%`,
                            backgroundColor: completed ? "var(--app-success)" : "var(--app-primary)",
                            transitionTimingFunction: "var(--ease-settle)",
                          }}
                        />
                      </div>
                    </div>

                    {/* Bottom row: value + actions */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono text-muted-foreground">
                        {currentValue}{unit ? ` ${unit}` : ""} / {goal}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          className="w-8 h-8 rounded-lg bg-secondary text-muted-foreground hover:bg-border hover:text-foreground flex items-center justify-center transition-all duration-200 cursor-pointer border-0"
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
                        </button>
                        <button
                          className={`
                            w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer border-0
                            ${completed
                              ? "bg-success/10 text-success"
                              : "bg-primary text-primary-foreground hover:brightness-110"
                            }
                          `}
                          disabled={pendingId === metric.id}
                          onClick={() => handleQuickLog(metric.id)}
                        >
                          <Check className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>}

          {/* Weekly Overview Chart */}
          <WeeklyChart metrics={metrics} sparklines={sparklines} />

          {/* Counters */}
          {dashboardSections.includes("counters") && counterMetrics.length > 0 && (
            <section className="mb-12 -mt-4 fade-section" style={{ animationDelay: "180ms" }}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger-children">
                {counterMetrics.map((metric, index) => {
                  const MetricIcon = getMetricIcon(metric, index);
                  const { sum, count } = getTodayValue(metric.id, todayEntries);
                  const isCountType = metric.valueType === "none" || metric.valueType === "bool";
                  const currentValue = isCountType ? count : (Number.isInteger(sum) ? sum : sum.toFixed(1));
                  const unit = metric.unit || "";

                  return (
                    <div key={metric.id} className="bg-card rounded-2xl border border-border p-4 card-texture">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
                            <MetricIcon className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-semibold" style={{ color: "var(--app-heading-color)" }}>{titleCase(metric.name)}</span>
                        </div>
                        <button
                          className="w-7 h-7 rounded-lg bg-secondary text-muted-foreground hover:bg-border hover:text-foreground flex items-center justify-center transition-all duration-200 cursor-pointer border-0"
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
                        </button>
                      </div>
                      <p className="text-lg font-mono font-semibold" style={{ color: "var(--app-heading-color)" }}>
                        {currentValue} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Nourishment (Food) */}
          {dashboardSections.includes("food") && <section className="mb-12 fade-section" style={{ animationDelay: "240ms" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xs font-medium text-muted-foreground uppercase" style={{ letterSpacing: "0.1em" }}>
                Nourishment
              </h3>
              <Link href="/food" className="text-xs text-muted-foreground hover:text-foreground no-underline flex items-center gap-0.5 transition-colors">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Macro summary cards */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: "Calories", value: foodTotals.calories, unit: "kcal", icon: Flame, color: "#C4653A" },
                { label: "Protein", value: foodTotals.protein, unit: "g", icon: Beef, color: "#5B8C5A" },
                { label: "Carbs", value: foodTotals.carbs, unit: "g", icon: Wheat, color: "#D4964A" },
                { label: "Fat", value: foodTotals.fat, unit: "g", icon: Droplet, color: "#C75B4A" },
              ].map((item) => (
                <div key={item.label} className="bg-card rounded-[28px] border border-border/80 px-4 py-7 text-center card-texture">
                  <item.icon className="mx-auto mb-5 h-4 w-4" strokeWidth={1.8} style={{ color: item.color }} />
                  <p className="font-mono text-[2rem] font-semibold leading-none" style={{ color: item.color }}>{item.value}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Meal rows */}
            <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden card-texture">
              {[
                { key: "breakfast", label: "Breakfast", icon: Coffee },
                { key: "lunch", label: "Lunch", icon: UtensilsCrossed },
                { key: "dinner", label: "Dinner", icon: Salad },
                { key: "snack", label: "Snack", icon: Cookie },
              ].map((meal) => {
                const summary = mealSummaries[meal.key] || { count: 0, calories: 0 };
                return (
                  <div key={meal.key} className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
                        <meal.icon className="w-4 h-4" strokeWidth={1.8} />
                      </div>
                      <div>
                        <span className="text-sm font-semibold block" style={{ color: "var(--app-heading-color)" }}>{meal.label}</span>
                        {summary.count > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {summary.count} {summary.count === 1 ? "item" : "items"} &middot; {summary.calories} cal
                          </span>
                        )}
                      </div>
                    </div>
                    <Button size="icon-xs" variant="secondary" asChild className="rounded-lg">
                      <Link href="/food">
                        <Plus className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          </section>}

          {/* Recent Activity */}
          {dashboardSections.includes("recent") && recentNonToday.length > 0 && (
            <section className="fade-section" style={{ animationDelay: "300ms" }}>
              <h3 className="text-xs font-medium text-muted-foreground uppercase mb-5" style={{ letterSpacing: "0.1em" }}>
                Recent Activity
              </h3>
              <div className="space-y-0.5">
                {recentNonToday.map((entry) => {
                  const metric = metrics.find((m) => m.id === entry.metricId);
                  const entryIndex = metric ? metrics.indexOf(metric) : 0;
                  const EntryIcon = metric
                    ? getMetricIcon(metric, entryIndex)
                    : Clock;

                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between py-2.5 px-4 rounded-xl hover:bg-secondary/50 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <EntryIcon className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
                        <span className="text-sm font-semibold" style={{ color: "var(--app-heading-color)" }}>
                          {titleCase(metric?.name ?? "Unknown")}
                        </span>
                        {entry.value && entry.value !== "done" && (
                          <span className="text-sm text-muted-foreground font-mono">
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
                        className="w-5 h-5 rounded border-border cursor-pointer accent-[var(--app-primary)]"
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
                        className="w-24 text-center font-mono text-lg"
                      />
                      {entryMetric.unit && <span className="text-sm text-muted-foreground">{entryMetric.unit}</span>}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2 justify-end">
                <Button type="button" variant="secondary" onClick={() => setEntryMetric(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={entryMetric.valueType !== "none" && !entryValue}>
                  Save
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
