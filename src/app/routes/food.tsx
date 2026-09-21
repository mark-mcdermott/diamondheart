import { ArrowLeft } from "lucide-react";
import { Link } from "@/app/link";
import { useSearchParams } from "@/app/navigation";
import { parseDate, toISODate } from "@/lib/dates";
import { isViewRange, type ViewRange } from "@/lib/view-range";
import { PageViewToggle } from "@/components/ui/view-toggle";
import { DateNavigator } from "@/components/ui/date-navigator";
import { FoodPageClient } from "@/app/sections/food/food-page-client";
import { FoodOverviewClient } from "@/app/sections/food/food-overview-client";

export function FoodRoute() {
  const params = useSearchParams();
  const rawView = params.get("view");
  const view: ViewRange = isViewRange(rawView) ? rawView : "day";

  if (view !== "day") {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h2>Food</h2>
            <p className="text-muted-foreground mt-1">Review macros over time</p>
          </div>
          <DateNavigator />
          <PageViewToggle defaultRange="day" />
        </div>
        <FoodOverviewClient />
      </div>
    );
  }

  return <FoodPageClient selectedDate={toISODate(parseDate(params.get("date") ?? undefined))} />;
}
