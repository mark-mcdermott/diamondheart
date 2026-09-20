import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { TrackingPageClient } from "./tracking-page-client";

/** Reads `GET /api/tracking` from the browser (docs/PORT-PLAN.md, Phase 3). */
export default async function TrackingPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2>Tracking</h2>
          <p className="text-muted-foreground mt-1">Track collections, hobbies, and misc stuff</p>
        </div>
      </div>
      <TrackingPageClient />
    </div>
  );
}
