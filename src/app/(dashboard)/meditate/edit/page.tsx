import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { MeditateEditPageClient } from "./edit-page-client";

/** Reads `GET /api/meditation` from the browser and seeds the defaults when a list is empty (docs/PORT-PLAN.md, Phase 3). */
export default async function MeditateEditPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/meditate" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2>Edit Meditation</h2>
          <p className="text-muted-foreground mt-1">Customize your styles and timer presets</p>
        </div>
      </div>
      <MeditateEditPageClient />
    </div>
  );
}
