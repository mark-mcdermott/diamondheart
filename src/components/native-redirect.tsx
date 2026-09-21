import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

/** Inside the native shell the marketing home is skipped for sign-in. */
export function NativeRedirect() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) window.location.replace("/login");
  }, []);
  return null;
}
