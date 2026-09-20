"use client";

import { Button } from "@/components/ui/button";

interface RetryCardProps {
  title: string;
  message: string;
  onRetry: () => void;
}

/** What a section shows when its read failed: the reason, and a way to try again without reloading the route. */
export function RetryCard({ title, message, onRetry }: RetryCardProps) {
  return (
    <div role="alert" className="rounded-lg border border-border bg-card px-4 py-6 text-center">
      <p className="text-sm font-medium" style={{ color: "var(--app-heading-color)" }}>
        {title}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{message}</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
