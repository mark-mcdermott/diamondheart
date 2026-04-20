"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isViewRange, type ViewRange } from "@/lib/view-range";

/**
 * Reads the current view from `?view=` and returns a setter that updates the URL
 * without scrolling. Omits the query param when the selection matches `defaultRange`
 * to keep default URLs clean.
 */
export function useViewRange(defaultRange: ViewRange = "day"): {
  view: ViewRange;
  setView: (next: ViewRange) => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const raw = params.get("view");
  const view: ViewRange = isViewRange(raw) ? raw : defaultRange;

  const setView = useCallback(
    (next: ViewRange) => {
      const nextParams = new URLSearchParams(params.toString());
      if (next === defaultRange) nextParams.delete("view");
      else nextParams.set("view", next);
      const query = nextParams.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, params, defaultRange],
  );

  return { view, setView };
}
