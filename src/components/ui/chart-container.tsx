import { ResponsiveContainer } from "recharts";

interface ChartContainerProps {
  children: React.ReactNode;
  height?: number;
}

export function ChartContainer({ children, height = 300 }: ChartContainerProps) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer
        width="100%"
        height="100%"
        /**
         * Recharts defaults this to {-1, -1} and renders nothing until its
         * ResizeObserver reports a size. Under Next's hydration that first
         * measurement can be missed, leaving the chart permanently blank —
         * every chart in the app was doing this on a cold load. Seeding a
         * plausible size makes it paint immediately; the observer corrects it.
         */
        initialDimension={{ width: 600, height }}
      >
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}
