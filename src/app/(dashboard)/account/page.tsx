import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AccountPageClient } from "./account-page-client";

/** Reads `GET /api/auth/me` from the browser (docs/PORT-PLAN.md, Phase 3). */
export default async function Account() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  return <AccountPageClient />;
}
