import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Don't show if already in standalone mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    // Don't show if previously dismissed
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) return;

    function handlePrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    }

    window.addEventListener("beforeinstallprompt", handlePrompt);

    // For iOS (no beforeinstallprompt), show a manual prompt on mobile Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    if (isIOS && isSafari) {
      setShowBanner(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setShowBanner(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  }

  if (!showBanner) return null;

  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md">
      <div className="bg-card border border-border rounded-xl p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <Download className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: "var(--app-heading-color)" }}>
              Add Diamondheart to Home Screen
            </p>
            {isIOS ? (
              <p className="text-xs text-muted-foreground mt-1">
                Tap the share button, then &quot;Add to Home Screen&quot; for the full app experience.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Install for quick access, offline support, and a native app feel.
              </p>
            )}
            {deferredPrompt && (
              <Button size="sm" className="mt-2" onClick={handleInstall}>
                Install
              </Button>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
