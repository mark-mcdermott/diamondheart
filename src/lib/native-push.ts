import { Capacitor } from "@capacitor/core";
import { apiFetch } from "@/app/api";

export type NativePushPermission = "granted" | "denied" | "prompt";

/** What the platform says today, without asking for anything. */
export async function nativePushPermission(): Promise<NativePushPermission> {
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const { receive } = await PushNotifications.checkPermissions();
  if (receive === "granted" || receive === "denied") return receive;
  return "prompt";
}

/**
 * The path a notification asked to open. A push is outside input: only a path
 * on this app is followed, never a URL or a protocol-relative one.
 */
export function tapDestination(data: unknown): string | null {
  if (!data || typeof data !== "object" || !("href" in data)) return null;
  const { href } = data;
  return typeof href === "string" && href.startsWith("/") && !href.startsWith("//") ? href : null;
}

/** Calls `open` with the destination whenever a notification is tapped; returns the unsubscribe. */
export async function onNativePushTap(open: (href: string) => void): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) return () => {};
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const listener = await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
    const href = tapDestination(notification.data);
    if (href) open(href);
  });
  return () => void listener.remove();
}

/** How long to wait for APNs or FCM to answer a registration before giving up. */
const REGISTRATION_TIMEOUT_MS = 15_000;

/**
 * Asks for permission and registers with the platform's push service. Resolves
 * to the device token, or null when permission is refused, registration fails,
 * or nothing answers in time — a shell without an `aps-environment` entitlement
 * or a `google-services.json` never does, and the caller must not hang on it.
 */
export async function registerNativePush(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;

  const { PushNotifications } = await import("@capacitor/push-notifications");

  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return null;

  const registered = await PushNotifications.addListener("registration", (token) => settle(token.value));
  const failed = await PushNotifications.addListener("registrationError", () => settle(null));
  let settle: (token: string | null) => void = () => {};
  const outcome = new Promise<string | null>((resolve) => {
    settle = resolve;
  });
  const timer = setTimeout(() => settle(null), REGISTRATION_TIMEOUT_MS);

  await PushNotifications.register();
  try {
    return await outcome;
  } finally {
    clearTimeout(timer);
    await Promise.all([registered.remove(), failed.remove()]);
  }
}

/** Registers and hands the token to the API; false when there is nothing to store. Call it signed in. */
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
