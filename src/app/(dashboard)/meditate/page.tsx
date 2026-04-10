import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { meditationSessions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MeditateClient } from "./meditate-client";

export default async function MeditatePage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const sessions = await db
    .select()
    .from(meditationSessions)
    .where(eq(meditationSessions.userId, session.userId))
    .orderBy(desc(meditationSessions.date))
    .limit(200);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2>Meditate</h2>
          <p className="text-muted-foreground mt-1">Start a session or review your practice</p>
        </div>
      </div>
      <MeditateClient sessions={sessions} />
    </div>
  );
}
