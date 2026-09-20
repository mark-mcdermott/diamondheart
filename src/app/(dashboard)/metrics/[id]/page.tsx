import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { MetricDetailClient } from "./metric-detail-client";

/** Reads through `GET /api/metrics/:id` from the browser (docs/PORT-PLAN.md, Phase 3). */
export default async function MetricDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const { id } = await params;
  return <MetricDetailClient id={id} />;
}
