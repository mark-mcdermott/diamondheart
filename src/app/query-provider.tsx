"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "./api";

/**
 * One QueryClient for the browser (docs/PORT-PLAN.md, Decision 5).
 *
 * - `networkMode: "always"`: Capacitor webviews lie about `navigator.onLine`,
 *   which left frunk's applet on "Loading…" forever.
 * - A 4xx is never retried; only a 5xx or a network failure earns one retry.
 * - No cache persistence: health, medical and financial data on a device that
 *   may be shared.
 *
 * On the server a fresh client is made per render so nothing leaks between
 * requests; nothing is prefetched there, so it never holds data.
 */

function retry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < 1;
}

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60_000, networkMode: "always", retry },
      mutations: { networkMode: "always", retry: false },
    },
  });
}

let browserClient: QueryClient | undefined;

function getQueryClient(): QueryClient {
  if (typeof window === "undefined") return makeQueryClient();
  return (browserClient ??= makeQueryClient());
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>;
}
