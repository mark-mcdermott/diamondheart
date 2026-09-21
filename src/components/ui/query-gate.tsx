"use client";

import type { ReactNode } from "react";
import { errorMessage } from "@/app/api";
import { RetryCard } from "./retry-card";

/** What a gate needs from a read: one query, or several combined by `combineQueries`. */
export interface GateSource<T> {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  data: T | undefined;
  refetch: () => void;
}

interface QueryGateProps<T> {
  query: GateSource<T>;
  /** The card's first line when the read fails, e.g. "Accounts could not be loaded". */
  title: string;
  skeleton: ReactNode;
  children: (data: T) => ReactNode;
}

/** Skeleton while a page's read is pending, a retry card when it failed, the page once it has data. */
export function QueryGate<T>({ query, title, skeleton, children }: QueryGateProps<T>) {
  if (query.isError) return <RetryCard title={title} message={errorMessage(query.error)} onRetry={query.refetch} />;
  if (query.isPending || query.data === undefined) return <>{skeleton}</>;
  return <>{children(query.data)}</>;
}

/** What `combineQueries` reads off each query: the structural slice of a `UseQueryResult`, so inference keeps each one's data type. */
interface QueryLike {
  data: unknown;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
}

type QueryData<Q extends QueryLike> = Exclude<Q["data"], undefined>;

/**
 * Several reads as one gate: pending until all have data, failed if any failed, retry refetches them all.
 *
 * Hoist each `useQuery` into a `const` before passing it here. Written inline, the
 * parameter's constraint contextually types the call's return and TanStack infers
 * `data: unknown` for it.
 */
export function combineQueries<T extends Record<string, QueryLike>>(queries: T): GateSource<{ [K in keyof T]: QueryData<T[K]> }> {
  const list = Object.values(queries);
  const failed = list.find((q) => q.isError);
  const ready = list.every((q) => q.data !== undefined);
  return {
    isPending: list.some((q) => q.isPending),
    isError: failed !== undefined,
    error: failed?.error,
    data: ready ? (Object.fromEntries(Object.entries(queries).map(([key, q]) => [key, q.data])) as { [K in keyof T]: QueryData<T[K]> }) : undefined,
    refetch: () => list.forEach((q) => void q.refetch()),
  };
}
