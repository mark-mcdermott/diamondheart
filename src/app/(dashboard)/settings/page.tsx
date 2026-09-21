import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SettingsClient } from "./settings-client";

/**
 * The first page to read through the API instead of server-rendering its data
 * (docs/PORT-PLAN.md, Phase 3). The session check stays so an anonymous visit
 * redirects before any client code runs.
 */
export default async function SettingsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  return <SettingsClient />;
}
