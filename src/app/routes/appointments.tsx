import { ArrowLeft } from "lucide-react";
import { Link } from "@/app/link";
import { AppointmentsPageClient } from "@/app/sections/appointments/appointments-page-client";

export function AppointmentsRoute() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2>Appointments</h2>
          <p className="text-muted-foreground mt-1">Track upcoming and past appointments</p>
        </div>
      </div>
      <AppointmentsPageClient />
    </div>
  );
}
