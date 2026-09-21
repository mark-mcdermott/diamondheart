import { useQuery } from "@tanstack/react-query";
import { api, keys } from "@/app/api";
import { QueryGate, combineQueries } from "@/components/ui/query-gate";
import { Skeleton, SkeletonRow } from "@/components/ui/skeleton";
import { RemindersClient } from "./reminders-client";

export function RemindersPageClient() {
  const reminders = useQuery({ queryKey: keys.reminders, queryFn: api.reminders.list });
  const metrics = useQuery({ queryKey: keys.metrics, queryFn: api.metrics.list });
  const reads = combineQueries({ reminders, metrics });
  return (
    <QueryGate
      query={reads}
      title="Reminders could not be loaded"
      skeleton={
        <div className="max-w-3xl mx-auto" aria-busy="true" aria-label="Loading reminders">
          <Skeleton className="h-7 w-40 rounded-lg mb-8" />
          <div className="bg-card rounded-lg">
            <SkeletonRow />
            <SkeletonRow />
          </div>
        </div>
      }
    >
      {(data) => <RemindersClient reminders={data.reminders} metrics={data.metrics.map((m) => ({ id: m.id, name: m.name }))} />}
    </QueryGate>
  );
}
