import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { entertainmentItems } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EntertainmentClient } from "./entertainment-client";

export default async function EntertainmentPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const items = await db
    .select()
    .from(entertainmentItems)
    .where(eq(entertainmentItems.userId, session.userId))
    .orderBy(desc(entertainmentItems.updatedAt));

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2>Entertainment</h2>
          <p className="text-muted-foreground mt-1">Track shows, movies, books, and music</p>
        </div>
      </div>
      <EntertainmentClient items={items} />
    </div>
  );
}
