import { useQuery } from "@tanstack/react-query";
import { api, errorMessage, keys } from "@/app/api";
import { RetryCard } from "@/components/ui/retry-card";
import { Skeleton } from "@/components/ui/skeleton";
import { FeedList } from "./feed-client";
import { MeditatingNowRow } from "./meditating-now";

export function FeedPageClient() {
  const feed = useQuery({ queryKey: keys.feed, queryFn: api.feed.list });

  if (feed.isPending) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading community">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-8 w-14 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (feed.isError) {
    return <RetryCard title="The community feed could not be loaded" message={errorMessage(feed.error)} onRetry={() => void feed.refetch()} />;
  }

  return (
    <>
      <MeditatingNowRow />
      <FeedList items={feed.data} />
    </>
  );
}
