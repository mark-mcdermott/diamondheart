import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getNavItems } from "@/app/actions/nav";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const navItems = await getNavItems(session.userId);

  return <SettingsClient navItems={navItems} />;
}
