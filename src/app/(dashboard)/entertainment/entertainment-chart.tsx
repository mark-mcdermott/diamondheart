"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { CHART_PALETTE } from "@/lib/chart-utils";
import { api, keys, type EntertainmentTotals } from "@/app/api";

type ChartView = "type" | "status";

const EMPTY_TOTALS: EntertainmentTotals = { byType: [], byStatus: [] };

const STATUS_LABELS: Record<string, string> = {
  watching: "Watching",
  reading: "Reading",
  listening: "Listening",
  completed: "Completed",
  dropped: "Dropped",
  queued: "Queued",
};

const TYPE_LABELS: Record<string, string> = {
  show: "Shows",
  movie: "Movies",
  book: "Books",
  music: "Music",
  podcast: "Podcasts",
  game: "Games",
};

export function EntertainmentChart() {
  const [view, setView] = useState<ChartView>("type");
  const totals = useQuery({ queryKey: keys.entertainmentTotals, queryFn: api.entertainment.totals });
  const data = totals.data ?? EMPTY_TOTALS;

  const chartData = view === "type"
    ? data.byType.map((d) => ({ label: TYPE_LABELS[d.type] || d.type, count: d.count }))
    : data.byStatus.map((d) => ({ label: STATUS_LABELS[d.status] || d.status, count: d.count }));

  if (chartData.length === 0) return null;

  return (
    <div className="border border-border rounded-lg p-4 bg-card mb-8">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold" style={{ color: "var(--app-heading-color)" }}>
          Library Overview
        </h4>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setView("type")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              view === "type"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            By Type
          </button>
          <button
            onClick={() => setView("status")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              view === "status"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            By Status
          </button>
        </div>
      </div>
      <ChartContainer height={Math.max(180, chartData.length * 40)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 10, bottom: 5, left: 75 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={70}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [`${value}`, "Count"]}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {chartData.map((_, idx) => (
              <Cell key={idx} fill={CHART_PALETTE[idx % CHART_PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
