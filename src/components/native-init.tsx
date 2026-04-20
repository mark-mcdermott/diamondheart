"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

export function NativeInit() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    (async () => {
      const { StatusBar, Style } = await import("@capacitor/status-bar");
      const { SplashScreen } = await import("@capacitor/splash-screen");
      const { Keyboard } = await import("@capacitor/keyboard");

      StatusBar.setStyle({ style: Style.Light }).catch(() => {});
      StatusBar.setBackgroundColor({ color: "#FFFBF7" }).catch(() => {});

      SplashScreen.hide().catch(() => {});

      Keyboard.setAccessoryBarVisible({ isVisible: true }).catch(() => {});
      Keyboard.setScroll({ isDisabled: false }).catch(() => {});
    })();
  }, []);

  return null;
}
