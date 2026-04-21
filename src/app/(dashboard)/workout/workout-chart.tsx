"use client";

import { useState, useEffect, useTransition } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { TimeRangePicker } from "@/components/ui/time-range-picker";
import { type TimeRange, CHART_COLORS, formatDateLabel, generateDateKeys } from "@/lib/chart-utils";
import { getWorkoutChartData } from "@/app/actions/chart-data";

type ChartView = "volume" | "duration";

export function WorkoutChart() {
  const [range, setRange] = useState<TimeRange>("month");
  const [view, setView] = useState<ChartView>("volume");
  const [, startTransition] = useTransition();
  const [rawData, setRawData] = useState<{ date: string; duration: number; volume: number; sessions: number }[]>([]);

  useEffect(() => {
    startTransition(async () => {
      const data = await getWorkoutChartData(range);
      setRawData(data);
    });
  }, [range]);

  const data = generateDateKeys(range).map((key) => {
    const match = rawData.find((r) => r.date === key);
    return {
      date: key,
      label: formatDateLabel(key, range),
      volume: match?.volume ?? 0,
      duration: match?.duration ?? 0,
    };
  });

  return (
    <div className="border border-border rounded-lg p-4 bg-card mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setView("volume")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              view === "volume"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Volume
          </button>
          <button
            onClick={() => setView("duration")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              view === "duration"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Duration
          </button>
        </div>
        <TimeRangePicker value={range} onChange={setRange} />
      </div>
      <ChartContainer height={250}>
        {view === "volume" ? (
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
              width={50}
              label={{ value: "lbs", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "var(--color-muted-foreground)" } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value) => [`${Number(value).toLocaleString()} lbs`, "Volume"]}
            />
            <Bar dataKey="volume" fill={CHART_COLORS.green} radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
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
              width={35}
              label={{ value: "min", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "var(--color-muted-foreground)" } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value) => [`${value} min`, "Duration"]}
            />
            <Line
              type="monotone"
              dataKey="duration"
              stroke={CHART_COLORS.sage}
              strokeWidth={2}
              dot={{ r: range === "week" ? 4 : 0 }}
              connectNulls
            />
          </LineChart>
        )}
      </ChartContainer>
    </div>
  );
}
