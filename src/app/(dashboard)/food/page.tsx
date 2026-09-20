import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { parseDate, toISODate } from "@/lib/dates";
import { FoodPageClient } from "./food-page-client";
import { FoodOverviewClient } from "./food-overview-client";
import { PageViewToggle } from "@/components/ui/view-toggle";
import { DateNavigator } from "@/components/ui/date-navigator";
import { isViewRange, type ViewRange } from "@/lib/view-range";

export default async function FoodPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const { date: dateParam, view: viewParam } = await searchParams;
  const view: ViewRange = isViewRange(viewParam) ? viewParam : "day";

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

  return <FoodPageClient selectedDate={toISODate(parseDate(dateParam))} />;
}
