"use client";

import { useState, useEffect, useTransition } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { TimeRangePicker } from "@/components/ui/time-range-picker";
import { type TimeRange, MACRO_COLORS, formatDateLabel, generateDateKeys, toDateKey } from "@/lib/chart-utils";
import { getFoodChartData } from "@/app/actions/chart-data";

interface FoodChartProps {
  totals: { calories: number; protein: number; carbs: number; fat: number };
}

export function FoodChart({ totals }: FoodChartProps) {
  const [range, setRange] = useState<TimeRange>("week");
  const [isPending, startTransition] = useTransition();
  const [rawData, setRawData] = useState<{ date: string; calories: number; protein: number; carbs: number; fat: number }[]>([]);

  useEffect(() => {
    startTransition(async () => {
      const data = await getFoodChartData(range);
      setRawData(data);
    });
  }, [range]);

  // Fill gaps with zeros
  const data = generateDateKeys(range).map((key) => {
    const match = rawData.find((r) => r.date === key);
    return {
      date: key,
      label: formatDateLabel(key, range),
      protein: match?.protein ?? 0,
      carbs: match?.carbs ?? 0,
      fat: match?.fat ?? 0,
    };
  });

  // Today's macro donut
  const totalMacroGrams = totals.protein + totals.carbs + totals.fat;
  const donutData = totalMacroGrams > 0
    ? [
        { name: "Protein", value: totals.protein, color: MACRO_COLORS.protein },
        { name: "Carbs", value: totals.carbs, color: MACRO_COLORS.carbs },
        { name: "Fat", value: totals.fat, color: MACRO_COLORS.fat },
      ]
    : [];

  return (
    <div className="space-y-6 mb-6">
      {/* Macro donut for today */}
      {donutData.length > 0 && (
        <div className="border border-border rounded-lg p-4 bg-card">
          <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--app-heading-color)" }}>
            Today&apos;s Macros
          </h4>
          <div className="flex items-center justify-center gap-8">
            <ChartContainer height={180}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {donutData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => [`${value}g`, name]}
                />
              </PieChart>
            </ChartContainer>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: MACRO_COLORS.protein }} />
                Protein: {totals.protein}g
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: MACRO_COLORS.carbs }} />
                Carbs: {totals.carbs}g
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: MACRO_COLORS.fat }} />
                Fat: {totals.fat}g
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stacked bar chart for macros over time */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold" style={{ color: "var(--app-heading-color)" }}>
            Daily Macros
          </h4>
          <TimeRangePicker value={range} onChange={setRange} />
        </div>
        <ChartContainer height={250}>
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
              label={{ value: "grams", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "var(--color-muted-foreground)" } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => [`${value}g`, name]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="protein" stackId="macros" fill={MACRO_COLORS.protein} name="Protein" radius={[0, 0, 0, 0]} />
            <Bar dataKey="carbs" stackId="macros" fill={MACRO_COLORS.carbs} name="Carbs" radius={[0, 0, 0, 0]} />
            <Bar dataKey="fat" stackId="macros" fill={MACRO_COLORS.fat} name="Fat" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}
