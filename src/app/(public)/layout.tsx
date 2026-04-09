import { Nav } from "@/components/blocks/nav";
import { Footer } from "@/components/blocks/footer";
import { defaultNavLinks } from "@/lib/config/nav";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user = null;
  try {
    const session = await getCurrentUser();
    if (session) {
      const [found] = await db
        .select({ id: users.id, email: users.email, name: users.name, avatarUrl: users.avatarUrl })
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);
      user = found || null;
    }
  } catch { /* no auth or DB */ }

  return (
    <div className="flex min-h-screen flex-col">
      <Nav siteName="Diamondheart" links={defaultNavLinks} user={user} showThemeToggle />
      <main className="flex-1">{children}</main>
      <Footer siteName="Diamondheart" />
    </div>
  );
}
