import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { TimeRangePicker } from "@/components/ui/time-range-picker";
import { type TimeRange, CHART_COLORS, CHART_PALETTE, formatDateLabel, generateDateKeys, getDateRange } from "@/lib/chart-utils";
import { toISODate } from "@/lib/dates";
import { api, keys, type MedicalTotals } from "@/app/api";

type ChartView = "frequency" | "severity";

const EMPTY_TOTALS: MedicalTotals = { byType: [], bySeverity: [] };

export function MedicalChart() {
  const [range, setRange] = useState<TimeRange>("month");
  const [view, setView] = useState<ChartView>("frequency");
  const { start, end } = getDateRange(range);
  const from = toISODate(start);
  const to = toISODate(end);
  const totals = useQuery({ queryKey: keys.medicalTotals(from, to), queryFn: () => api.medical.totals(from, to) });
  const data: MedicalTotals = totals.data ?? EMPTY_TOTALS;

  const severityData = generateDateKeys(range).map((key) => {
    const match = data.bySeverity.find((r) => r.date === key);
    return {
      date: key,
      label: formatDateLabel(key, range),
      severity: match?.avgSeverity ?? null,
      count: match?.count ?? 0,
    };
  });

  const typeLabels: Record<string, string> = {
    bathroom: "Bathroom",
    symptom: "Symptom",
    medication: "Medication",
    doctor: "Doctor",
    sick: "Sick",
  };

  return (
    <div className="border border-border rounded-lg p-4 bg-card mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setView("frequency")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              view === "frequency"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            By Type
          </button>
          <button
            onClick={() => setView("severity")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              view === "severity"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Severity
          </button>
        </div>
        <TimeRangePicker value={range} onChange={setRange} />
      </div>
      <ChartContainer height={250}>
        {view === "frequency" ? (
          <BarChart
            data={data.byType.map((d) => ({ ...d, label: typeLabels[d.type] || d.type }))}
            layout="vertical"
            margin={{ top: 5, right: 10, bottom: 5, left: 70 }}
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
              width={65}
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
              {data.byType.map((_, idx) => (
                <Cell key={idx} fill={CHART_PALETTE[idx % CHART_PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        ) : (
          <LineChart data={severityData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
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
              width={30}
              domain={[0, 5]}
              ticks={[1, 2, 3, 4, 5]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value) => [`${value}/5`, "Avg Severity"]}
            />
            <Line
              type="monotone"
              dataKey="severity"
              stroke={CHART_COLORS.rose}
              strokeWidth={2}
              dot={{ r: range === "week" ? 4 : 2, fill: CHART_COLORS.rose }}
              connectNulls
            />
          </LineChart>
        )}
      </ChartContainer>
    </div>
  );
}
