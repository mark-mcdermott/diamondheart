import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <Skeleton className="h-3 w-12 mb-2" />
          <Skeleton className="h-9 w-56 mb-2 rounded-lg" />
          <Skeleton className="h-3.5 w-36" />
        </div>
        <Skeleton className="w-[88px] h-[88px] rounded-full" />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mb-10">
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>

      {/* Section header */}
      <Skeleton className="h-3 w-28 mb-5" />

      {/* Goal cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-12">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Nourishment section */}
      <Skeleton className="h-3 w-24 mb-5" />
      <div className="grid grid-cols-4 gap-3 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-3 flex flex-col items-center gap-1.5">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-5 w-8" />
            <Skeleton className="h-2 w-12" />
          </div>
        ))}
      </div>
      <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <Skeleton className="h-3.5 w-20" />
            </div>
            <Skeleton className="w-6 h-6 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
