"use client";

import { useState, useMemo } from "react";
import { isNumericValueType } from "@/lib/metric-types";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { TimeRangePicker } from "@/components/ui/time-range-picker";
import {
  type TimeRange,
  CHART_COLORS,
  generateDateKeys,
  toDateKey,
  formatDateLabel,
  getDateRange,
} from "@/lib/chart-utils";

interface MetricChartProps {
  entries: { value: string; date: string }[];
  valueType: string;
  unit: string | null;
  dailyGoal: number | null;
}

type ChartType = "line" | "bar";

export function MetricChart({ entries, valueType, unit, dailyGoal }: MetricChartProps) {
  const [range, setRange] = useState<TimeRange>("month");
  const [chartType, setChartType] = useState<ChartType>("line");

  // Only show charts for numeric metrics
  const isNumeric = isNumericValueType(valueType);
  const isCounter = valueType === "none";

  const data = useMemo(() => {
    const { start, end } = getDateRange(range);
    const keys = generateDateKeys(range);

    // Aggregate entries by date key
    const buckets: Record<string, { sum: number; count: number }> = {};
    for (const key of keys) {
      buckets[key] = { sum: 0, count: 0 };
    }

    for (const entry of entries) {
      const entryDate = new Date(entry.date);
      if (entryDate < start || entryDate > end) continue;

      const key = toDateKey(entryDate, range);
      if (!buckets[key]) buckets[key] = { sum: 0, count: 0 };

      if (isNumeric) {
        const val = parseFloat(entry.value);
        if (!isNaN(val)) {
          buckets[key].sum += val;
          buckets[key].count++;
        }
      } else {
        // Counter/done metrics: count occurrences
        buckets[key].count++;
      }
    }

    return keys.map((key) => ({
      date: key,
      label: formatDateLabel(key, range),
      value: isNumeric
        ? buckets[key].count > 0
          ? Math.round((buckets[key].sum / buckets[key].count) * 100) / 100
          : null
        : buckets[key].count,
    }));
  }, [entries, range, isNumeric]);

  if (!isNumeric && !isCounter) return null;

  const unitLabel = unit ? ` ${unit}` : "";
  const yLabel = isCounter ? "Count" : unit || "Value";

  return (
    <div className="border border-border rounded-lg p-4 bg-card mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setChartType("line")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              chartType === "line"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Line
          </button>
          <button
            onClick={() => setChartType("bar")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              chartType === "bar"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Bar
          </button>
        </div>
        <TimeRangePicker value={range} onChange={setRange} />
      </div>
      <ChartContainer height={250}>
        {chartType === "line" ? (
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
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
              formatter={(value) => [`${value}${unitLabel}`, yLabel]}
            />
            {dailyGoal && (
              <ReferenceLine
                y={dailyGoal}
                stroke={CHART_COLORS.green}
                strokeDasharray="4 4"
                label={{ value: "Goal", fill: CHART_COLORS.green, fontSize: 11 }}
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              dot={{ r: range === "week" ? 4 : 0 }}
              activeDot={{ r: 5, fill: CHART_COLORS.primary }}
              connectNulls
            />
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
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
              formatter={(value) => [`${value}${unitLabel}`, yLabel]}
            />
            {dailyGoal && (
              <ReferenceLine
                y={dailyGoal}
                stroke={CHART_COLORS.green}
                strokeDasharray="4 4"
                label={{ value: "Goal", fill: CHART_COLORS.green, fontSize: 11 }}
              />
            )}
            <Bar
              dataKey="value"
              fill={CHART_COLORS.primary}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        )}
      </ChartContainer>
    </div>
  );
}
