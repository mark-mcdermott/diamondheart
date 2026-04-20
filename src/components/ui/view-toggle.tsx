"use client";

import { cn } from "@/lib/utils";
import { VIEW_RANGES, type ViewRange } from "@/lib/view-range";
import { useViewRange } from "@/lib/use-view-range";

interface ViewToggleProps {
  value: ViewRange;
  onChange: (next: ViewRange) => void;
  /** Subset of ranges to expose. Defaults to all four. */
  available?: readonly ViewRange[];
  className?: string;
}

export function ViewToggle({ value, onChange, available, className }: ViewToggleProps) {
  const allowed = available ?? VIEW_RANGES.map((r) => r.value);
  const ranges = VIEW_RANGES.filter((r) => allowed.includes(r.value));

  if (ranges.length <= 1) return null;

  return (
    <div
      role="tablist"
      aria-label="Change view range"
      className={cn("inline-flex items-center gap-0.5 rounded-full bg-muted p-0.5", className)}
    >
      {ranges.map(({ value: v, label, icon: Icon }) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={label}
            title={label}
            onClick={() => onChange(v)}
            className={cn(
              "inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors cursor-pointer",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="w-4 h-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}

interface PageViewToggleProps {
  defaultRange?: ViewRange;
  available?: readonly ViewRange[];
  className?: string;
}

/**
 * Header-ready wrapper that binds ViewToggle to the ?view= URL param.
 * Drop this into a page header to add Day/Week/Month/Year navigation.
 */
export function PageViewToggle({ defaultRange = "day", available, className }: PageViewToggleProps) {
  const { view, setView } = useViewRange(defaultRange);
  return <ViewToggle value={view} onChange={setView} available={available} className={className} />;
}
