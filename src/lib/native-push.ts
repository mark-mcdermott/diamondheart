import { Capacitor } from "@capacitor/core";
import { apiFetch } from "@/app/api";

export async function registerNativePush(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;

  const { PushNotifications } = await import("@capacitor/push-notifications");

  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return null;

  await PushNotifications.register();

  return new Promise((resolve) => {
    PushNotifications.addListener("registration", (token) => {
      resolve(token.value);
    });
    PushNotifications.addListener("registrationError", () => {
      resolve(null);
    });
  });
}

export async function syncDeviceToken(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  const platform = Capacitor.getPlatform();
  if (platform !== "ios" && platform !== "android") return false;

  const token = await registerNativePush();
  if (!token) return false;

  try {
    const res = await apiFetch("/api/push/device-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, token }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
