import { cn } from "@/lib/utils";

export function MetricCard({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("bg-card rounded-xl border border-border p-5 hover:border-muted-foreground/30 transition-colors", className)} {...props}>
      {children}
    </div>
  );
}

export function MetricCardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex items-start justify-between gap-4", className)}>{children}</div>;
}

export function MetricCardIcon({ emoji = "📊", color = "#3b82f6" }: { emoji?: string; color?: string }) {
  return (
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
      style={{ backgroundColor: `${color}26` }}
    >
      {emoji}
    </div>
  );
}

export function MetricCardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn("font-semibold text-foreground", className)}>{children}</h3>;
}

export function MetricCardValue({ children, unit, color, className }: { children: React.ReactNode; unit?: string; color?: string; className?: string }) {
  return (
    <div className={cn("text-3xl font-bold", className)} style={color ? { color } : undefined}>
      {children}
      {unit && <span className="text-lg font-normal text-muted-foreground ml-1">{unit}</span>}
    </div>
  );
}

export function MetricCardProgress({ value, goal, color = "#3b82f6" }: { value: number; goal: number; color?: string }) {
  const percentage = Math.min(Math.round((value / goal) * 100), 100);
  const isComplete = percentage >= 100;

  return (
    <div className="mt-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-muted-foreground">{percentage}% of goal</span>
        {isComplete && <span className="text-emerald-600 font-medium">Goal reached!</span>}
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
