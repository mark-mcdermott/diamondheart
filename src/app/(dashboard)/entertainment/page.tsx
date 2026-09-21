import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { EntertainmentPageClient } from "./entertainment-page-client";

/** Reads `GET /api/entertainment` and the preferences from the browser (docs/PORT-PLAN.md, Phase 3). */
export default async function EntertainmentPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  return <EntertainmentPageClient />;
}
