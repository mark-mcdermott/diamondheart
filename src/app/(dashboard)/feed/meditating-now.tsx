"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Flower } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api, keys } from "@/app/api";
import {
  PRESENCE_HEARTBEAT_MS,
  summarizeMeditators,
  type PresenceMeditator,
} from "@/lib/presence";

const AVATAR_CAP = 5;

/** Polls presence on the heartbeat cadence; a failed poll keeps the last answer and the next one retries. */
export function MeditatingNowRow() {
  const presence = useQuery({
    queryKey: keys.meditatingNow,
    queryFn: api.meditation.presence.get,
    refetchInterval: PRESENCE_HEARTBEAT_MS,
  });
  const data = presence.data;

  if (!data || data.count === 0) return null;

  const preview = data.meditators.slice(0, AVATAR_CAP);
  const overflow = Math.max(0, data.count - preview.length);

  return (
    <div
      className="flex items-center gap-4 p-4 mb-4 rounded-lg border border-primary/30 bg-primary/5"
      aria-live="polite"
    >
      <div className="relative flex items-center justify-center h-11 w-11 shrink-0">
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-primary/20 animate-ping"
          style={{ animationDuration: "2.4s" }}
        />
        <span className="relative flex items-center justify-center h-11 w-11 rounded-full bg-primary text-primary-foreground">
          <Flower className="w-5 h-5" aria-hidden="true" />
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground">
          {pluralize(data.count)} meditating right now
        </p>
        <p className="text-sm text-muted-foreground mt-0.5 truncate">
          {summarizeMeditators(preview, overflow)}
        </p>
      </div>
      <div className="flex -space-x-2 shrink-0" aria-hidden="true">
        {preview.map((m) => (
          <MeditatorAvatar key={m.userId} meditator={m} />
        ))}
        {overflow > 0 ? (
          <span className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-muted-foreground text-xs font-medium border-2 border-background">
            +{overflow}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function MeditatorAvatar({ meditator }: { meditator: PresenceMeditator }) {
  const initials = getInitials(meditator.name);
  const avatar = (
    <Avatar className="h-8 w-8 border-2 border-background">
      {meditator.avatarUrl ? (
        <AvatarImage src={meditator.avatarUrl} alt="" />
      ) : null}
      <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
    </Avatar>
  );
  if (meditator.isAnonymous) return avatar;
  return (
    <Link
      href={`/u/${meditator.userId}`}
      aria-label={meditator.name ?? "Meditator"}
      className="hover:opacity-80 transition-opacity"
    >
      {avatar}
    </Link>
  );
}

function pluralize(n: number): string {
  return `${n} ${n === 1 ? "person" : "people"}`;
}

function getInitials(name: string | null): string {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "·";
}
