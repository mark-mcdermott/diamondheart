import { ArrowLeft, Pencil } from "lucide-react";
import { Link } from "@/app/link";
import { PageViewToggle } from "@/components/ui/view-toggle";
import { DateNavigator } from "@/components/ui/date-navigator";
import { MeditatePageClient } from "@/app/sections/meditate/meditate-page-client";
import { MeditateEditPageClient } from "@/app/sections/meditate/edit/edit-page-client";

export function MeditateRoute() {
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

export function MeditateEditRoute() {
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
