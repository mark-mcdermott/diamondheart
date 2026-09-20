"use client";

import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api, errorMessage, keys, type FeedItemView } from "@/app/api";
import { formatRelativeTime, formatDuration } from "@/lib/feed-format";
import { cn } from "@/lib/utils";

const REACT_KEY = ["feed", "react"] as const;

export function FeedList({ items }: { items: FeedItemView[] }) {
  const queryClient = useQueryClient();

  /** The heart flips in the cached list at once and is put back if the server disagrees. */
  const react = useMutation({
    mutationKey: REACT_KEY,
    mutationFn: ({ sessionId, reacted }: { sessionId: string; reacted: boolean }) => api.feed.react(sessionId, reacted),
    onMutate: async ({ sessionId, reacted }) => {
      await queryClient.cancelQueries({ queryKey: keys.feed });
      const previous = queryClient.getQueryData<FeedItemView[]>(keys.feed);
      queryClient.setQueryData<FeedItemView[]>(keys.feed, (current) =>
        current?.map((item) =>
          item.sessionId === sessionId
            ? { ...item, reactedByMe: reacted, reactionCount: item.reactionCount + (reacted ? 1 : -1) }
            : item
        )
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(keys.feed, context.previous);
      toast.error(errorMessage(error));
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: REACT_KEY }) === 1) void queryClient.invalidateQueries({ queryKey: keys.feed });
    },
  });

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

  const pendingId = react.isPending ? react.variables.sessionId : null;

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <FeedRow
          key={item.sessionId}
          item={item}
          pending={pendingId === item.sessionId}
          onToggle={() => react.mutate({ sessionId: item.sessionId, reacted: !item.reactedByMe })}
        />
      ))}
    </ul>
  );
}

function FeedRow({ item, pending, onToggle }: { item: FeedItemView; pending: boolean; onToggle: () => void }) {
  const initials = useMemo(() => getInitials(item.userName), [item.userName]);
  const relative = useMemo(() => formatRelativeTime(new Date(item.date)), [item.date]);
  const duration = useMemo(() => formatDuration(item.duration), [item.duration]);

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
        disabled={pending}
        aria-pressed={item.reactedByMe}
        aria-label={item.reactedByMe ? "Remove reaction" : "Send a heart"}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors",
          item.reactedByMe
            ? "border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
            : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40",
          pending && "opacity-70",
        )}
      >
        <Heart
          className={cn("w-4 h-4", item.reactedByMe && "fill-current")}
          aria-hidden="true"
        />
        <span className="tabular-nums">{item.reactionCount}</span>
      </button>
    </li>
  );
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}
