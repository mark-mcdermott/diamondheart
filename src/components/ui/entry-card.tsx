import { cn } from "@/lib/utils";

export function EntryCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex items-center gap-4 p-4 bg-card rounded-lg border border-border hover:border-muted-foreground/30 transition-colors", className)}>
      {children}
    </div>
  );
}

export function EntryCardIcon({ emoji = "📊", color = "#3b82f6" }: { emoji?: string; color?: string }) {
  return (
    <div
      className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
      style={{ backgroundColor: `${color}26` }}
    >
      {emoji}
    </div>
  );
}

export function EntryCardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex-1 min-w-0", className)}>{children}</div>;
}

export function EntryCardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h4 className={cn("font-medium text-foreground truncate", className)}>{children}</h4>;
}

export function EntryCardMeta({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-sm text-muted-foreground mt-0.5", className)}>{children}</p>;
}

export function EntryCardValue({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("text-right flex-shrink-0", className)}>{children}</div>;
}
