import { useQuery } from "@tanstack/react-query";
import { api, errorMessage, keys } from "@/app/api";
import { RetryCard } from "@/components/ui/retry-card";
import { Skeleton, SkeletonRow } from "@/components/ui/skeleton";
import { AppointmentsClient } from "./appointments-client";

export function AppointmentsPageClient() {
  const appointments = useQuery({ queryKey: keys.appointments, queryFn: api.appointments.list });

  if (appointments.isPending) {
    return (
      <div aria-busy="true" aria-label="Loading appointments">
        <div className="flex justify-end mb-6">
          <Skeleton className="h-8 w-40 rounded-lg" />
        </div>
        {["Upcoming", "Past"].map((section) => (
          <div key={section} className="mb-8">
            <Skeleton className="h-3 w-20 mb-4" />
            <div className="bg-card rounded-lg">
              <SkeletonRow />
              <SkeletonRow />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (appointments.isError) {
    return (
      <RetryCard
        title="Appointments could not be loaded"
        message={errorMessage(appointments.error)}
        onRetry={() => void appointments.refetch()}
      />
    );
  }

  return <AppointmentsClient appointments={appointments.data} />;
}
