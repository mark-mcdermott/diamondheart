import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { PageViewToggle } from "@/components/ui/view-toggle";
import { DateNavigator } from "@/components/ui/date-navigator";
import { MedicalPageClient } from "./medical-page-client";

/** Reads `GET /api/medical` and the totals endpoint from the browser (docs/PORT-PLAN.md, Phase 3). */
export default async function MedicalPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h2>Medical</h2>
          <p className="text-muted-foreground mt-1">Track health, symptoms, and doctor visits</p>
        </div>
        <DateNavigator />
        <PageViewToggle />
      </div>
      <MedicalPageClient />
    </div>
  );
}
