import { Skeleton } from "@/components/ui/skeleton";

/** The shape every finance page shares while its read is pending: a header, a summary band, then cards. */
export function FinancePageSkeleton({ cards = 3, wide = false }: { cards?: number; wide?: boolean }) {
  return (
    <div className={`${wide ? "max-w-5xl" : "max-w-3xl"} mx-auto`} aria-busy="true" aria-label="Loading">
      <div className="flex items-center gap-4 mb-8">
        <Skeleton className="w-5 h-5 rounded" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-40 rounded-lg" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>
      <Skeleton className="h-28 rounded-2xl mb-6" />
      <div className="space-y-3">
        {Array.from({ length: cards }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
