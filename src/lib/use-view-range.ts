"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "@/app/navigation";
import {
  isViewRange,
  parseAnchorDate,
  toISODateAnchor,
  type ViewRange,
} from "@/lib/view-range";

/**
 * Reads `?view=` and `?date=` from the URL and returns getters + setters that
 * update them without scrolling. Omits a param when the selection matches the
 * default, so clean URLs stay clean.
 *
 * - `view` falls back to `defaultRange` if missing or invalid.
 * - `anchor` is `null` (live) when `?date=` is missing or invalid; otherwise a
 *   local-midnight Date parsed from YYYY-MM-DD.
 */
export function useViewRange(defaultRange: ViewRange = "day"): {
  view: ViewRange;
  anchor: Date | null;
  setView: (next: ViewRange) => void;
  setAnchor: (next: Date | null) => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const rawView = params.get("view");
  const view: ViewRange = isViewRange(rawView) ? rawView : defaultRange;
  const anchor = parseAnchorDate(params.get("date"));

  const writeParams = useCallback(
    (next: URLSearchParams) => {
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const setView = useCallback(
    (next: ViewRange) => {
      const nextParams = new URLSearchParams(params.toString());
      if (next === defaultRange) nextParams.delete("view");
      else nextParams.set("view", next);
      writeParams(nextParams);
    },
    [params, defaultRange, writeParams],
  );

  const setAnchor = useCallback(
    (next: Date | null) => {
      const nextParams = new URLSearchParams(params.toString());
      if (next === null) nextParams.delete("date");
      else nextParams.set("date", toISODateAnchor(next));
      writeParams(nextParams);
    },
    [params, writeParams],
  );

  return { view, anchor, setView, setAnchor };
}
