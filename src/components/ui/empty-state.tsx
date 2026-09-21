import { Link } from "@/app/link";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  showIllustration?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  showIllustration = false,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center fade-section">
      {showIllustration ? (
        <img
          src="/illustration.png"
          alt=""
          className="h-32 w-auto object-contain mb-6 opacity-60"
        />
      ) : Icon ? (
        <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-5">
          <Icon className="w-7 h-7 text-muted-foreground" strokeWidth={1.5} />
        </div>
      ) : null}
      <h3 className="font-display text-lg font-semibold mb-2" style={{ color: "var(--app-heading-color)" }}>
        {title}
      </h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && actionHref && (
        <Button asChild variant="outline" className="rounded-xl">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
      {actionLabel && onAction && !actionHref && (
        <Button variant="outline" className="rounded-xl" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
