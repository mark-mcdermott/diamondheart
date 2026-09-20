"use client";

import { useMemo, useState, useTransition } from "react";
import { surfaceErrors } from "@/lib/action-result";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toggleReaction, type FeedItem } from "@/app/actions/feed";
import { formatRelativeTime, formatDuration } from "@/lib/feed-format";
import { cn } from "@/lib/utils";

export function FeedList({ items }: { items: FeedItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <p className="text-foreground font-medium">No meditations to show yet</p>
        <p className="text-muted-foreground text-sm mt-2">
          When other members meditate, their sessions will appear here.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <FeedRow key={item.sessionId} item={item} />
      ))}
    </ul>
  );
}

function FeedRow({ item }: { item: FeedItem }) {
  const [reactedByMe, setReactedByMe] = useState(item.reactedByMe);
  const [count, setCount] = useState(item.reactionCount);
  const [isPending, startTransition] = useTransition();

  const initials = useMemo(() => getInitials(item.userName), [item.userName]);
  const relative = useMemo(() => formatRelativeTime(item.date), [item.date]);
  const duration = useMemo(() => formatDuration(item.duration), [item.duration]);

  function onToggle() {
    const nextReacted = !reactedByMe;
    setReactedByMe(nextReacted);
    setCount((c) => c + (nextReacted ? 1 : -1));

    startTransition(async () => {
      const fd = new FormData();
      fd.set("sessionId", item.sessionId);
      const result = await surfaceErrors(toggleReaction(fd));
      if (!result.success) {
        setReactedByMe(!nextReacted);
        setCount((c) => c + (nextReacted ? -1 : 1));
      }
    });
  }

  return (
    <li className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border hover:border-muted-foreground/30 transition-colors">
      <Link
        href={`/u/${item.userId}`}
        className="flex items-center gap-4 flex-1 min-w-0 group"
      >
        <Avatar className="h-11 w-11">
          {item.userAvatarUrl ? <AvatarImage src={item.userAvatarUrl} alt="" /> : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate group-hover:underline underline-offset-4">
            {item.userName ?? "Someone"}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Meditated for {duration} · {relative}
          </p>
        </div>
      </Link>
      <button
        type="button"
        onClick={onToggle}
        disabled={isPending}
        aria-pressed={reactedByMe}
        aria-label={reactedByMe ? "Remove reaction" : "Send a heart"}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors",
          reactedByMe
            ? "border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
            : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40",
          isPending && "opacity-70",
        )}
      >
        <Heart
          className={cn("w-4 h-4", reactedByMe && "fill-current")}
          aria-hidden="true"
        />
        <span className="tabular-nums">{count}</span>
      </button>
    </li>
  );
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}
