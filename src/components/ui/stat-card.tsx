import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function StatCard({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("bg-card rounded-xl border border-border p-4 flex flex-col", className)} {...props}>
      {children}
    </div>
  );
}

export function StatCardIcon({ emoji = "📊", color = "#3b82f6" }: { emoji?: string; color?: string }) {
  return (
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
      style={{ backgroundColor: `${color}20` }}
    >
      {emoji}
    </div>
  );
}

export function StatCardValue({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("text-2xl font-bold text-foreground", className)}>{children}</div>;
}

export function StatCardLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("text-sm text-muted-foreground font-medium", className)}>{children}</div>;
}

export function StatCardTrend({ value, label = "vs last week" }: { value: number; label?: string }) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  const color = isPositive ? "text-emerald-600" : isNegative ? "text-red-600" : "text-muted-foreground";

  return (
    <div className={cn("flex items-center gap-1 text-sm", color)}>
      <Icon className="h-4 w-4" />
      <span>{isPositive ? "+" : ""}{value}%</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
