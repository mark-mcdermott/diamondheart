"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { TrackerMetric } from "@/db/schema";

interface WeeklyChartProps {
  metrics: TrackerMetric[];
  sparklines: Record<string, { date: string; value: number }[]>;
}

const CHART_COLORS = [
  "#C4653A", "#5B8C5A", "#8B7355", "#D4764A",
  "#6B8F71", "#A0785A", "#7A9E7E", "#B5694B",
];

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function WeeklyChart({ metrics, sparklines }: WeeklyChartProps) {
  // Pick top metrics that have data (max 4 for readability)
  const metricsWithData = metrics.filter((m) => sparklines[m.id]?.length > 0);
  const topMetrics = metricsWithData.slice(0, 4);

  if (topMetrics.length === 0) return null;

  // Build date range for last 7 days
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  // Build chart data
  const data = days.map((date) => {
    const d = new Date(date + "T12:00:00");
    const row: Record<string, string | number> = {
      date,
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
    };
    for (const metric of topMetrics) {
      const entry = sparklines[metric.id]?.find((e) => e.date === date);
      row[metric.id] = entry?.value ?? 0;
    }
    return row;
  });

  return (
    <section className="mb-12 fade-section">
      <h3 className="text-xs font-medium text-muted-foreground uppercase mb-5" style={{ letterSpacing: "0.1em" }}>
        Weekly Overview
      </h3>
      <div className="bg-card rounded-2xl border border-border p-4 card-texture">
        <div className="w-full" style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={35}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value) => {
                  const metric = topMetrics.find((m) => m.id === value);
                  return metric ? titleCase(metric.name) : value;
                }}
              />
              {topMetrics.map((metric, i) => (
                <Bar
                  key={metric.id}
                  dataKey={metric.id}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  radius={[3, 3, 0, 0]}
                  name={metric.id}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
