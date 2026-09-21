import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errorMessage, keys } from "@/app/api";
import { RetryCard } from "@/components/ui/retry-card";
import { Skeleton, SkeletonRow } from "@/components/ui/skeleton";
import { MeditateEditClient } from "./edit-client";

function EditSkeleton() {
  return (
    <div className="space-y-12" aria-busy="true" aria-label="Loading meditation settings">
      {["Default Timer", "Styles", "Timer Presets"].map((section) => (
        <div key={section}>
          <Skeleton className="h-3 w-24 mb-4" />
          <div className="bg-card rounded-lg">
            <SkeletonRow />
            <SkeletonRow />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * A fresh account has no styles or presets. The old page seeded them while
 * rendering; here the seed is one explicit call, made once, and the page
 * shows its skeleton until the refetch carries the seeded lists.
 */
export function MeditateEditPageClient() {
  const queryClient = useQueryClient();
  const overview = useQuery({ queryKey: keys.meditation, queryFn: api.meditation.overview });
  const seed = useMutation({
    mutationFn: api.meditation.seedDefaults,
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.meditation }),
  });
  const { mutate: seedDefaults, isIdle: seedIdle } = seed;

  const needsSeed = overview.data !== undefined && (overview.data.styles.length === 0 || overview.data.presets.length === 0);

  useEffect(() => {
    if (needsSeed && seedIdle) seedDefaults();
  }, [needsSeed, seedIdle, seedDefaults]);

  if (overview.isError) {
    return <RetryCard title="Meditation settings could not be loaded" message={errorMessage(overview.error)} onRetry={() => void overview.refetch()} />;
  }
  if (seed.isError) {
    return <RetryCard title="The starter styles could not be added" message={errorMessage(seed.error)} onRetry={() => seed.reset()} />;
  }
  if (overview.isPending || needsSeed) return <EditSkeleton />;

  const { styles, presets, defaultTimerSeconds } = overview.data;
  return <MeditateEditClient styles={styles} presets={presets} defaultTimerSeconds={defaultTimerSeconds} />;
}
