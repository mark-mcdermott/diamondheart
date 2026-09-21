import { useSearchParams } from "@/app/navigation";
import { parseDate, toISODate } from "@/lib/dates";
import { DashboardPageClient } from "@/app/sections/dashboard/dashboard-page-client";

export function DashboardRoute() {
  const params = useSearchParams();
  return <DashboardPageClient selectedDate={toISODate(parseDate(params.get("date") ?? undefined))} />;
}
