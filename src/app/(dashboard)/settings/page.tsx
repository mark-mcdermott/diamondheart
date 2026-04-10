import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getNavItems } from "@/app/actions/nav";
import { getUserPreferences } from "@/app/actions/preferences";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const [navItems, prefs] = await Promise.all([
    getNavItems(session.userId),
    getUserPreferences(session.userId),
  ]);

  return (
    <SettingsClient
      navItems={navItems}
      useNetflixUI={prefs.useNetflixUI}
      showSiteName={prefs.showSiteName}
      dashboardSections={prefs.dashboardSections}
    />
  );
}
