import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface ToggleOption {
  label: string;
  href: string;
  icon?: LucideIcon;
}

interface ViewToggleProps {
  options: [ToggleOption, ToggleOption];
  activeHref: string;
  className?: string;
}

export function ViewToggle({ options, activeHref, className }: ViewToggleProps) {
  return (
    <div className={cn("inline-flex rounded-lg bg-muted p-1", className)} role="tablist">
      {options.map((option) => {
        const isActive = option.href === activeHref;
        return (
          <Link
            key={option.href}
            href={option.href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors no-underline",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.icon && <option.icon className="h-4 w-4" />}
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
