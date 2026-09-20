import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { FinancesPageClient } from "./finances-page-client";

/** Reads `GET /api/finances`, the section's one aggregate, from the browser (docs/PORT-PLAN.md, Phase 3). */
export default async function FinancesPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  return <FinancesPageClient />;
}
