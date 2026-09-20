import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { PageViewToggle } from "@/components/ui/view-toggle";
import { DateNavigator } from "@/components/ui/date-navigator";
import { MeditatePageClient } from "./meditate-page-client";

/** Reads `GET /api/meditation` from the browser (docs/PORT-PLAN.md, Phase 3). */
export default async function MeditatePage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

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
        <DateNavigator />
        <PageViewToggle />
        <Link href="/meditate/edit" className="text-muted-foreground hover:text-foreground" aria-label="Edit meditation">
          <Pencil className="w-4 h-4" />
        </Link>
      </div>
      <MeditatePageClient />
    </div>
  );
}
