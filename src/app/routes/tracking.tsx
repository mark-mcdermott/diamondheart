import { ArrowLeft } from "lucide-react";
import { Link } from "@/app/link";
import { TrackingPageClient } from "@/app/sections/tracking/tracking-page-client";

export function TrackingRoute() {
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
