import { Capacitor } from "@capacitor/core";

export async function hapticTap() {
  if (!Capacitor.isNativePlatform()) return;
  const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}

export async function hapticSuccess() {
  if (!Capacitor.isNativePlatform()) return;
  const { Haptics, NotificationType } = await import("@capacitor/haptics");
  Haptics.notification({ type: NotificationType.Success }).catch(() => {});
}

export async function hapticHeavy() {
  if (!Capacitor.isNativePlatform()) return;
  const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
  Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
}
