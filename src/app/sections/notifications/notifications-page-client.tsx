import { useQuery } from "@tanstack/react-query";
import { api, errorMessage, keys } from "@/app/api";
import { RetryCard } from "@/components/ui/retry-card";
import { Skeleton, SkeletonRow } from "@/components/ui/skeleton";
import { NotificationsClient } from "./notifications-client";

export function NotificationsPageClient() {
  const notifications = useQuery({ queryKey: keys.notifications, queryFn: api.notifications.list });

  if (notifications.isPending) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading notifications">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-7 w-40 rounded-lg" />
        </div>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonRow key={i} className="bg-card border border-border" />
          ))}
        </div>
      </div>
    );
  }

  if (notifications.isError) {
    return (
      <RetryCard
        title="Notifications could not be loaded"
        message={errorMessage(notifications.error)}
        onRetry={() => void notifications.refetch()}
      />
    );
  }

  return <NotificationsClient notifications={notifications.data.notifications} />;
}
