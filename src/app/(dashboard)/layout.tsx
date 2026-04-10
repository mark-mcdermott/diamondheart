import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Nav } from "@/components/blocks/nav";
import { Footer } from "@/components/blocks/footer";
import { getNavItems } from "@/app/actions/nav";
import { getUnreadCount } from "@/app/actions/notifications";
import type { NavLink } from "@/components/blocks/nav";

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

  const [navItems, notificationCount] = await Promise.all([
    getNavItems(session.userId),
    getUnreadCount(session.userId),
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
    <div className="flex min-h-screen flex-col">
      <Nav
        siteName="Diamondheart"
        logo="/logo.png"
        links={links}
        user={{ id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl }}
        notificationCount={notificationCount}
        showThemeToggle
      />
      <main className="flex-1 px-4 py-6 mx-auto w-full max-w-5xl">
        {children}
      </main>
      <Footer siteName="Diamondheart" logoImage="/logo.png" />
    </div>
  );
}
