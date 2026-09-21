"use client";

import { Link } from "@/app/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api, errorMessage, keys } from "@/app/api";
import { RetryCard } from "@/components/ui/retry-card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageViewToggle } from "@/components/ui/view-toggle";
import { DateNavigator } from "@/components/ui/date-navigator";
import { EntertainmentClient } from "./entertainment-client";
import { NetflixClient } from "./netflix-client";

function Header({ subtitle, children }: { subtitle: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <div className="flex-1">
        <h2>Entertainment</h2>
        <p className="text-muted-foreground mt-1">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

/** Which of the two libraries to show is a preference, so both reads gate the page. */
export function EntertainmentPageClient() {
  const items = useQuery({ queryKey: keys.entertainment, queryFn: api.entertainment.list });
  const preferences = useQuery({ queryKey: keys.preferences, queryFn: api.preferences.get });
  const queries = [items, preferences];

  if (queries.some((q) => q.isPending)) {
    return (
      <div className="max-w-5xl mx-auto" aria-busy="true" aria-label="Loading entertainment">
        <Header subtitle="Loading your library" />
        <Skeleton className="h-10 w-full max-w-md rounded-lg mb-8" />
        <div className="flex gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-48 w-32 shrink-0 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const failed = queries.find((q) => q.isError);
  if (failed) {
    return (
      <div className="max-w-3xl mx-auto">
        <Header subtitle="Track shows, movies, books, and music" />
        <RetryCard title="Entertainment could not be loaded" message={errorMessage(failed.error)} onRetry={() => queries.forEach((q) => void q.refetch())} />
      </div>
    );
  }

  if (preferences.data!.useNetflixUI) {
    return (
      <div className="max-w-5xl mx-auto">
        <Header subtitle="Browse your movies and shows" />
        <NetflixClient items={items.data!} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Header subtitle="Track shows, movies, books, and music">
        <DateNavigator />
        <PageViewToggle defaultRange="week" available={["week", "month", "year"]} />
      </Header>
      <EntertainmentClient items={items.data!} />
    </div>
  );
}
