"use client";

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

interface TrackingChartProps {
  items: { name: string; count: number; category: string | null }[];
}

export function TrackingChart({ items }: TrackingChartProps) {
  if (items.length === 0) return null;

  // Group by category
  const categories = new Map<string, number>();
  for (const item of items) {
    const cat = item.category || "Uncategorized";
    categories.set(cat, (categories.get(cat) || 0) + item.count);
  }

  const data = Array.from(categories.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  if (data.length === 0) return null;

  return (
    <div className="border border-border rounded-lg p-4 bg-card mb-8">
      <h4 className="text-sm font-semibold mb-4" style={{ color: "var(--app-heading-color)" }}>
        Items by Category
      </h4>
      <ChartContainer height={Math.max(160, data.length * 40)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 10, bottom: 5, left: 90 }}
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
            dataKey="category"
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={85}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number) => [`${value}`, "Total Count"]}
          />
          <Bar dataKey="total" radius={[0, 4, 4, 0]}>
            {data.map((_, idx) => (
              <Cell key={idx} fill={CHART_PALETTE[idx % CHART_PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
