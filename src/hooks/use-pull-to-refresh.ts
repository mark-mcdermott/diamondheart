"use client";

import { useRef, useEffect, useCallback } from "react";
import { useRouter } from "@/app/navigation";
import { Capacitor } from "@capacitor/core";

/** Pull down at the top of the page to refresh. Pages that read through the API pass their refetch; the rest reload the route. */
export function usePullToRefresh(onRefresh?: () => unknown) {
  const router = useRouter();
  const startY = useRef(0);
  const pulling = useRef(false);

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, []);

  const onTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!pulling.current) return;
      pulling.current = false;
      const dy = e.changedTouches[0].clientY - startY.current;
      if (dy > 80) if (onRefresh) void onRefresh(); else router.refresh();
    },
    [router, onRefresh],
  );

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd);
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [onTouchStart, onTouchEnd]);
}
