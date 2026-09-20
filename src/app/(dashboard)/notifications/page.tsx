import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { NotificationsPageClient } from "./notifications-page-client";

/** Reads `GET /api/notifications` from the browser (docs/PORT-PLAN.md, Phase 3). */
export default async function NotificationsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  return <NotificationsPageClient />;
}
