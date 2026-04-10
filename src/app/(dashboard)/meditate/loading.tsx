import { Skeleton, SkeletonRow } from "@/components/ui/skeleton";

export default function MeditateLoading() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="h-7 w-40 rounded-lg" />
      </div>

      {/* Timer ring placeholder */}
      <div className="flex justify-center mb-10">
        <Skeleton className="w-64 h-64 rounded-full" />
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3 mb-12">
        <Skeleton className="h-10 w-24 rounded-xl" />
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>

      {/* Session history */}
      <Skeleton className="h-3 w-20 mb-5" />
      <div className="space-y-1">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    </div>
  );
}
