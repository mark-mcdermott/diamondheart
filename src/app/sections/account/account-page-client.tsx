"use client";

import { useQuery } from "@tanstack/react-query";
import { api, keys } from "@/app/api";
import { AccountPage } from "@/components/blocks/account-page";
import { QueryGate } from "@/components/ui/query-gate";
import { Skeleton } from "@/components/ui/skeleton";

function AccountSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading account">
      <Skeleton className="h-4 w-24 mb-6" />
      <Skeleton className="h-9 w-40 rounded-lg mb-8" />
      <div className="space-y-6">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function AccountPageClient() {
  const me = useQuery({ queryKey: keys.me, queryFn: api.auth.me });

  return (
    <QueryGate query={me} title="Your account could not be loaded" skeleton={<AccountSkeleton />}>
      {(user) => (
        <AccountPage
          user={user ? { id: user.id, email: user.email, name: user.name ?? undefined, avatarUrl: user.avatarUrl } : null}
          backHref="/dashboard"
          backLabel="Dashboard"
        />
      )}
    </QueryGate>
  );
}
