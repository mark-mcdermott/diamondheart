"use client";

import { ResponsiveContainer } from "recharts";

interface ChartContainerProps {
  children: React.ReactNode;
  height?: number;
}

export function ChartContainer({ children, height = 300 }: ChartContainerProps) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}
