import { useQuery } from "@tanstack/react-query";
import { api, errorMessage, keys } from "@/app/api";
import { RetryCard } from "@/components/ui/retry-card";
import { Skeleton, SkeletonRow } from "@/components/ui/skeleton";
import { MeditateClient } from "./meditate-client";

/** The timer card, chart and history placeholders, shared with the route's loading file. */
export function MeditateSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading meditation">
      <div className="bg-card rounded-2xl mb-12 px-6 py-6">
        <div className="flex gap-3 mb-8">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
        <div className="flex justify-center mb-8">
          <Skeleton className="w-64 h-64 rounded-full" />
        </div>
        <div className="flex justify-center gap-2 mb-6">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-8 w-16 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-14 w-full rounded-full" />
      </div>
      <Skeleton className="h-64 rounded-lg mb-8" />
      <Skeleton className="h-3 w-24 mb-4" />
      <div className="bg-card rounded-lg">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    </div>
  );
}

export function MeditatePageClient() {
  const overview = useQuery({ queryKey: keys.meditation, queryFn: api.meditation.overview });

  if (overview.isPending) return <MeditateSkeleton />;

  if (overview.isError) {
    return <RetryCard title="Meditation could not be loaded" message={errorMessage(overview.error)} onRetry={() => void overview.refetch()} />;
  }

  const { sessions, styles, presets, defaultTimerSeconds } = overview.data;
  return <MeditateClient sessions={sessions} styles={styles} presets={presets} defaultTimerSeconds={defaultTimerSeconds} />;
}
