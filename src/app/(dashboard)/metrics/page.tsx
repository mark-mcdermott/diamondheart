import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { MetricsClient } from "./metrics-client";

/** Reads through `GET /api/metrics/overview` from the browser (docs/PORT-PLAN.md, Phase 3). */
export default async function MetricsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  return <MetricsClient />;
}
