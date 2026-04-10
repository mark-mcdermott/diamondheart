import { Skeleton, SkeletonRow } from "@/components/ui/skeleton";

export default function FoodLoading() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="h-7 w-32 rounded-lg" />
      </div>

      {/* Macro cards */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-3 flex flex-col items-center gap-1.5">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-5 w-8" />
            <Skeleton className="h-2 w-12" />
          </div>
        ))}
      </div>

      {/* Meal sections */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="mb-6">
          <Skeleton className="h-3.5 w-20 mb-3" />
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <SkeletonRow />
            <SkeletonRow />
          </div>
        </div>
      ))}
    </div>
  );
}
