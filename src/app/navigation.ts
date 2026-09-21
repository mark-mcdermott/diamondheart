import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useSearchParams as useRouterSearchParams } from "react-router";
import { isAppletPath } from "./paths";

/**
 * `next/navigation`'s hooks, for the applet only: every caller lives under the
 * router and the QueryClient. Components rendered on public pages navigate
 * with `window.location` instead.
 */

export function useRouter() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return useMemo(
    () => ({
      push: (to: string) => (isAppletPath(to) ? navigate(to) : window.location.assign(to)),
      replace: (to: string, options?: { scroll?: boolean }) =>
        navigate(to, { replace: true, preventScrollReset: options?.scroll === false }),
      back: () => navigate(-1),
      /** The old refresh re-rendered server components; the data lives in Query now, so refetch it. */
      refresh: () => void queryClient.invalidateQueries(),
    }),
    [navigate, queryClient]
  );
}

export function usePathname(): string {
  return useLocation().pathname;
}

export function useSearchParams(): URLSearchParams {
  const [params] = useRouterSearchParams();
  return params;
}
