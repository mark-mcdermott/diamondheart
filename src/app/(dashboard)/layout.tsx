import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Nav } from "@/components/blocks/nav";
import { Footer } from "@/components/blocks/footer";
import { defaultNavLinks } from "@/lib/config/nav";

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

  return (
    <div className="flex min-h-screen flex-col">
      <Nav
        siteName="Diamondheart"
        logo="/logo.png"
        links={defaultNavLinks}
        user={{ id: user.id, email: user.email, name: user.name }}
        showThemeToggle
      />
      <main className="flex-1 px-4 py-6 mx-auto w-full max-w-5xl">
        {children}
      </main>
      <Footer siteName="Diamondheart" logoImage="/logo.png" />
    </div>
  );
}
