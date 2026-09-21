import { ArrowLeft } from "lucide-react";
import { Link } from "@/app/link";
import { PageViewToggle } from "@/components/ui/view-toggle";
import { DateNavigator } from "@/components/ui/date-navigator";
import { MedicalPageClient } from "@/app/sections/medical/medical-page-client";

export function MedicalRoute() {
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
