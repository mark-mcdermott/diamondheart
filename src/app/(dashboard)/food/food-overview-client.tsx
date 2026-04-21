"use client";

import { useEffect, useState, useTransition } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { MACRO_COLORS } from "@/lib/chart-utils";
import { useViewRange } from "@/lib/use-view-range";
import { viewRangeBounds, viewRangeLabel, toISODateAnchor } from "@/lib/view-range";
import { getFoodDailyTotals } from "@/app/actions/chart-data";
import { Flame, Beef, Wheat, Droplet } from "lucide-react";

interface DailyTotal {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MonthlyTotal {
  month: string;
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  days: number;
}

function rollupByMonth(daily: DailyTotal[]): MonthlyTotal[] {
  const map = new Map<string, MonthlyTotal>();
  for (const d of daily) {
    const [y, m] = d.date.split("-");
    const key = `${y}-${m}`;
    const existing =
      map.get(key) ??
      {
        month: key,
        label: new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", { month: "short" }),
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        days: 0,
      };
    existing.calories += d.calories;
    existing.protein += d.protein;
    existing.carbs += d.carbs;
    existing.fat += d.fat;
    existing.days += 1;
    map.set(key, existing);
  }
  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
}

function formatDayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatDayShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function FoodOverviewClient() {
  const { view, anchor } = useViewRange("day");
  const periodLabel = viewRangeLabel(view, anchor);
  const bounds = viewRangeBounds(view, anchor ?? new Date());

  const [data, setData] = useState<DailyTotal[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const rows = await getFoodDailyTotals(
        toISODateAnchor(bounds.start),
        toISODateAnchor(new Date(bounds.end.getTime() - 1)),
      );
      setData(rows);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds.start.getTime(), bounds.end.getTime()]);

  const isYear = view === "year";
  const monthly = isYear ? rollupByMonth(data) : [];
  const chartData = isYear
    ? monthly.map((m) => ({ label: m.label, protein: m.protein, carbs: m.carbs, fat: m.fat }))
    : data.map((d) => ({ label: formatDayShort(d.date), protein: d.protein, carbs: d.carbs, fat: d.fat }));

  const totalCalories = data.reduce((acc, d) => acc + d.calories, 0);
  const totalProtein = data.reduce((acc, d) => acc + d.protein, 0);
  const totalCarbs = data.reduce((acc, d) => acc + d.carbs, 0);
  const totalFat = data.reduce((acc, d) => acc + d.fat, 0);
  const daysWithData = data.length;
  const avgCalories = daysWithData > 0 ? Math.round(totalCalories / daysWithData) : 0;

  return (
    <>
      <p className="text-sm text-muted-foreground mb-6">
        {periodLabel}
        {daysWithData > 0 && (
          <> &middot; avg {avgCalories.toLocaleString()} cal/day across {daysWithData} {daysWithData === 1 ? "day" : "days"}</>
        )}
      </p>

      {/* Summary totals */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Calories", value: totalCalories, unit: "kcal", icon: Flame, color: "#C4653A" },
          { label: "Protein", value: totalProtein, unit: "g", icon: Beef, color: MACRO_COLORS.protein },
          { label: "Carbs", value: totalCarbs, unit: "g", icon: Wheat, color: MACRO_COLORS.carbs },
          { label: "Fat", value: totalFat, unit: "g", icon: Droplet, color: MACRO_COLORS.fat },
        ].map((item) => (
          <div key={item.label} className="border border-border rounded-lg p-3 bg-card">
            <div className="flex items-center gap-1.5 mb-1">
              <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
            <p className="text-lg font-semibold tabular-nums" style={{ color: "var(--app-heading-color)" }}>
              {item.value.toLocaleString()}
              <span className="text-xs text-muted-foreground font-normal ml-1">{item.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="border border-border rounded-lg p-4 bg-card mb-8">
        <h4 className="text-sm font-semibold mb-4" style={{ color: "var(--app-heading-color)" }}>
          Macro Trends
        </h4>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">
            {isPending ? "Loading…" : "No food logged in this period."}
          </p>
        ) : (
          <ChartContainer height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="protein" stackId="macros" fill={MACRO_COLORS.protein} name="Protein" />
              <Bar dataKey="carbs" stackId="macros" fill={MACRO_COLORS.carbs} name="Carbs" />
              <Bar dataKey="fat" stackId="macros" fill={MACRO_COLORS.fat} name="Fat" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </div>

      {/* Daily list */}
      {isYear ? (
        <section>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Monthly totals</h3>
          {monthly.length === 0 ? (
            <p className="text-sm text-muted-foreground">No food logged this year.</p>
          ) : (
            <div className="bg-card rounded-lg divide-y divide-border">
              {monthly.map((m) => (
                <div key={m.month} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-medium" style={{ color: "var(--app-heading-color)" }}>
                    {m.label}
                    <span className="text-xs text-muted-foreground ml-2">({m.days} {m.days === 1 ? "day" : "days"} logged)</span>
                  </span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {m.calories.toLocaleString()} cal &middot; {m.protein}p / {m.carbs}c / {m.fat}f
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Daily totals</h3>
          {data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No food logged in this period.</p>
          ) : (
            <div className="bg-card rounded-lg divide-y divide-border">
              {data.map((d) => (
                <div key={d.date} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-medium" style={{ color: "var(--app-heading-color)" }}>
                    {formatDayLabel(d.date)}
                  </span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {d.calories.toLocaleString()} cal &middot; {d.protein}p / {d.carbs}c / {d.fat}f
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
