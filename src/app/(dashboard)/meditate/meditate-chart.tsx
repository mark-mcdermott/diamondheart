"use client";

import { useState, useEffect, useTransition } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { TimeRangePicker } from "@/components/ui/time-range-picker";
import { type TimeRange, CHART_COLORS, formatDateLabel, generateDateKeys } from "@/lib/chart-utils";
import { getMeditationChartData } from "@/app/actions/chart-data";

export function MeditateChart() {
  const [range, setRange] = useState<TimeRange>("week");
  const [isPending, startTransition] = useTransition();
  const [rawData, setRawData] = useState<{ date: string; minutes: number; sessions: number }[]>([]);

  useEffect(() => {
    startTransition(async () => {
      const data = await getMeditationChartData(range);
      setRawData(data);
    });
  }, [range]);

  const data = generateDateKeys(range).map((key) => {
    const match = rawData.find((r) => r.date === key);
    return {
      date: key,
      label: formatDateLabel(key, range),
      minutes: match?.minutes ?? 0,
    };
  });

  return (
    <div className="border border-border rounded-lg p-4 bg-card mb-8">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold" style={{ color: "var(--app-heading-color)" }}>
          Meditation Time
        </h4>
        <TimeRangePicker value={range} onChange={setRange} />
      </div>
      <ChartContainer height={220}>
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
            formatter={(value: number) => [`${value} min`, "Duration"]}
          />
          <Bar dataKey="minutes" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
