import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AccountPage } from "@/components/blocks/account-page";

export default async function Account() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) redirect("/login");

  return (
    <AccountPage
      user={{ id: user.id, email: user.email, name: user.name || undefined, avatarUrl: user.avatarUrl }}
      backHref="/dashboard"
      backLabel="Dashboard"
    />
  );
}
