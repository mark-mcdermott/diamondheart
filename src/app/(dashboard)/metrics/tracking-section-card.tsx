"use client";

import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface TrackingSectionCardProps {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  enabled: boolean;
  summaryLine: string;
  onToggle: () => void;
  isPending: boolean;
}

export function TrackingSectionCard({
  title,
  description,
  href,
  icon: Icon,
  enabled,
  summaryLine,
  onToggle,
  isPending,
}: TrackingSectionCardProps) {
  return (
    <div
      className={`border border-border rounded-lg p-4 bg-card transition-opacity ${
        enabled ? "" : "opacity-50"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <Icon className="w-5 h-5 text-primary" />
          <span
            className="font-semibold text-sm"
            style={{ color: "var(--app-heading-color)" }}
          >
            {title}
          </span>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          disabled={isPending}
          size="sm"
        />
      </div>
      <p className="text-xs text-muted-foreground mb-3">{description}</p>
      {enabled && (
        <>
          <p className="text-sm font-medium mb-3">{summaryLine}</p>
          <Button variant="secondary" size="sm" asChild className="w-full">
            <Link href={href}>Open {title}</Link>
          </Button>
        </>
      )}
    </div>
  );
}
