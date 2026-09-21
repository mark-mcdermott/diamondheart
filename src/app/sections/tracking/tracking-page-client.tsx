import { useQuery } from "@tanstack/react-query";
import { api, errorMessage, keys } from "@/app/api";
import { RetryCard } from "@/components/ui/retry-card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrackingClient } from "./tracking-client";

export function TrackingPageClient() {
  const items = useQuery({ queryKey: keys.tracking, queryFn: api.tracking.list });

  if (items.isPending) {
    return (
      <div aria-busy="true" aria-label="Loading tracking">
        <Skeleton className="h-48 rounded-lg mb-8" />
        <div className="flex justify-end mb-6">
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (items.isError) {
    return <RetryCard title="Tracking could not be loaded" message={errorMessage(items.error)} onRetry={() => void items.refetch()} />;
  }

  return <TrackingClient items={items.data} />;
}
