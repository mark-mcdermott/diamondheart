import { useEffect } from "react";

export function PWADetector() {
  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      document.cookie = "pwa-mode=standalone; path=/; max-age=31536000; SameSite=Lax";
    }
  }, []);

  return null;
}
