import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { meditationSessions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { getMeditationStyles, getMeditationPresets, getDefaultTimerSeconds } from "@/app/actions/meditation";
import { MeditateClient } from "./meditate-client";
import { PageViewToggle } from "@/components/ui/view-toggle";

export default async function MeditatePage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const [sessions, styles, presets, defaultTimerSeconds] = await Promise.all([
    db.select()
      .from(meditationSessions)
      .where(eq(meditationSessions.userId, session.userId))
      .orderBy(desc(meditationSessions.date))
      .limit(200),
    getMeditationStyles(session.userId),
    getMeditationPresets(session.userId),
    getDefaultTimerSeconds(session.userId),
  ]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h2>Meditate</h2>
          <p className="text-muted-foreground mt-1">Start a session or review your practice</p>
        </div>
        <PageViewToggle />
        <Link href="/meditate/edit" className="text-muted-foreground hover:text-foreground">
          <Pencil className="w-4 h-4" />
        </Link>
      </div>
      <MeditateClient sessions={sessions} styles={styles} presets={presets} defaultTimerSeconds={defaultTimerSeconds} />
    </div>
  );
}
