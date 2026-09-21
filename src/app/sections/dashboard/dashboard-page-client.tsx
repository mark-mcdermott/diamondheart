import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errorMessage, keys } from "@/app/api";
import { Button } from "@/components/ui/button";
import { DashboardClient } from "./dashboard-client";

/**
 * The dashboard, read through the API (docs/PORT-PLAN.md, Phase 3): one
 * aggregate call for the day plus the preferences for which sections show.
 * `DashboardClient` keeps the markup and calls back here to refetch after a log.
 */
export function DashboardPageClient({ selectedDate }: { selectedDate: string }) {
  const queryClient = useQueryClient();
  const dashboard = useQuery({ queryKey: keys.dashboard(selectedDate), queryFn: () => api.dashboard.get(selectedDate) });
  const preferences = useQuery({ queryKey: keys.preferences, queryFn: api.preferences.get });

  if (dashboard.isPending || preferences.isPending) {
    return (
      <div className="max-w-4xl mx-auto" aria-busy="true" aria-label="Loading dashboard">
        <div className="mb-10">
          <div className="h-3 w-16 rounded bg-muted animate-pulse mb-3" />
          <div className="h-9 w-72 rounded bg-muted animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-12">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-36 rounded-2xl border border-border bg-card animate-pulse" />
          ))}
        </div>
        <div className="h-40 rounded-2xl border border-border bg-card animate-pulse" />
      </div>
    );
  }

  if (dashboard.isError || preferences.isError) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="rounded-lg border border-border bg-card px-4 py-6 text-center">
          <p className="text-sm font-medium" style={{ color: "var(--app-heading-color)" }}>
            The dashboard could not be loaded
          </p>
          <p className="text-xs text-muted-foreground mt-1">{errorMessage(dashboard.error ?? preferences.error)}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              void dashboard.refetch();
              void preferences.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const data = dashboard.data;
  const onChanged = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.dashboard(selectedDate) }),
      queryClient.invalidateQueries({ queryKey: ["metrics"] }),
    ]);

  return (
    <DashboardClient
      onChanged={onChanged}
      weightUnit={preferences.data.weightUnit}
      metrics={data.metrics}
      todayEntries={data.todayEntries}
      recentEntries={data.recentEntries}
      foodTotals={data.food.totals}
      mealSummaries={data.food.meals}
      sparklines={data.sparklines}
      dashboardSections={preferences.data.dashboardSections}
      selectedDate={selectedDate}
    />
  );
}
