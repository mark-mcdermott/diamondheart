import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { parseDate, toISODate } from "@/lib/dates";
import { DashboardPageClient } from "./dashboard-page-client";

/** Reads through `GET /api/dashboard` from the browser (docs/PORT-PLAN.md, Phase 3). */
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const { date } = await searchParams;
  return <DashboardPageClient selectedDate={toISODate(parseDate(date))} />;
}
