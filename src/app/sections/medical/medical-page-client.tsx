"use client";

import { useQuery } from "@tanstack/react-query";
import { api, errorMessage, keys } from "@/app/api";
import { RetryCard } from "@/components/ui/retry-card";
import { Skeleton, SkeletonRow } from "@/components/ui/skeleton";
import { MedicalClient } from "./medical-client";

export function MedicalPageClient() {
  const logs = useQuery({ queryKey: keys.medical, queryFn: api.medical.list });

  if (logs.isPending) {
    return (
      <div aria-busy="true" aria-label="Loading medical">
        <Skeleton className="h-64 rounded-lg mb-8" />
        <Skeleton className="h-3 w-20 mb-4" />
        <div className="flex flex-wrap gap-2 mb-8">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-3 w-32 mb-4" />
        <div className="bg-card rounded-lg">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    );
  }

  if (logs.isError) {
    return <RetryCard title="Medical could not be loaded" message={errorMessage(logs.error)} onRetry={() => void logs.refetch()} />;
  }

  return <MedicalClient logs={logs.data} />;
}
