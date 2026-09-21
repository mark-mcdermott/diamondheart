import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SidebarNav } from "@/components/blocks/sidebar-nav";
import { BiometricLockGate } from "@/components/biometric-lock-gate";
import { QueryProvider } from "@/app/query-provider";
import { readNavItems } from "@/server/api/nav";
import { unreadCount } from "@/server/api/notifications";
import { readPreferences } from "@/server/api/preferences";
import type { NavLink } from "@/components/blocks/sidebar-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) redirect("/login");

  const [navItems, notificationCount, prefs] = await Promise.all([
    readNavItems(session.userId),
    unreadCount(session.userId),
    readPreferences(session.userId),
  ]);

  // Convert user nav items to NavLink format
  const links: NavLink[] = navItems
    .filter((item) => item.visible)
    .map((item) => ({
      label: item.label,
      href: item.href,
      requiresAuth: true,
    }));

  return (
    <BiometricLockGate>
      <div className="min-h-screen">
        <SidebarNav
          siteName="Diamondheart"
          logo="/logo.png"
          links={links}
          user={{ id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl }}
          notificationCount={notificationCount}
          showSiteName={prefs.showSiteName}
          showThemeToggle
        />
        <main className="md:ml-[68px] px-4 py-6 pb-24 md:pb-6 mx-auto w-full max-w-4xl">
          <QueryProvider>{children}</QueryProvider>
        </main>
      </div>
    </BiometricLockGate>
  );
}
