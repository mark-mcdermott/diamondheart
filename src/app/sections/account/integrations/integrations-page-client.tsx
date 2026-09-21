import { useQuery } from "@tanstack/react-query";
import { api, keys } from "@/app/api";
import { QueryGate } from "@/components/ui/query-gate";
import { Skeleton } from "@/components/ui/skeleton";
import { IntegrationsClient } from "./integrations-client";

export function IntegrationsPageClient() {
  const integrations = useQuery({ queryKey: keys.integrations, queryFn: api.integrations.list });
  return (
    <QueryGate
      query={integrations}
      title="Integrations could not be loaded"
      skeleton={
        <div className="max-w-3xl mx-auto space-y-4" aria-busy="true" aria-label="Loading integrations">
          <Skeleton className="h-7 w-40 rounded-lg mb-8" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      }
    >
      {(data) => <IntegrationsClient connections={data.connections} ouraConfigured={data.ouraConfigured} />}
    </QueryGate>
  );
}
