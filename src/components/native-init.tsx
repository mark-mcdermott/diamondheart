import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { syncDeviceToken } from "@/lib/native-push";
import { fetchWidgetSnapshot } from "@/lib/widget-snapshot";
import { syncStreakToWidgets } from "@/lib/widget-sync";

function useThemeObserver(callback: (isDark: boolean) => void) {
  useEffect(() => {
    const html = document.documentElement;
    const observer = new MutationObserver(() => {
      callback(html.classList.contains("dark"));
    });
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    callback(html.classList.contains("dark"));
    return () => observer.disconnect();
  }, [callback]);
}

export function NativeInit() {
  const [offline, setOffline] = useState(false);

  useThemeObserver((isDark) => {
    if (!Capacitor.isNativePlatform()) return;
    import("@capacitor/status-bar").then(({ StatusBar, Style }) => {
      StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => {});
      StatusBar.setBackgroundColor({ color: isDark ? "#1A1614" : "#FFFBF7" }).catch(() => {});
    });
  });

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    (async () => {
      const { SplashScreen } = await import("@capacitor/splash-screen");
      const { Keyboard } = await import("@capacitor/keyboard");
      const { Network } = await import("@capacitor/network");
      const { App } = await import("@capacitor/app");

      SplashScreen.hide().catch(() => {});

      Keyboard.setAccessoryBarVisible({ isVisible: true }).catch(() => {});
      Keyboard.setScroll({ isDisabled: false }).catch(() => {});

      const status = await Network.getStatus();
      setOffline(!status.connected);
      Network.addListener("networkStatusChange", (s) => setOffline(!s.connected));

      App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          App.minimizeApp();
        }
      });

      syncDeviceToken().catch(() => {});

      const pushWidgetSnapshot = async () => {
        const snap = await fetchWidgetSnapshot();
        if (snap) await syncStreakToWidgets(snap);
      };
      pushWidgetSnapshot();
      App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) pushWidgetSnapshot();
      });
    })();
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-destructive text-destructive-foreground text-center text-xs py-1.5 font-medium" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.375rem)" }}>
      No internet connection
    </div>
  );
}
