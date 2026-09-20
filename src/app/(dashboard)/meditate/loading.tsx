import { Skeleton } from "@/components/ui/skeleton";
import { MeditateSkeleton } from "./meditate-page-client";

export default function MeditateLoading() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="h-7 w-40 rounded-lg" />
      </div>
      <MeditateSkeleton />
    </div>
  );
}
