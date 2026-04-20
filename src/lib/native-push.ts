import { Capacitor } from "@capacitor/core";

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
