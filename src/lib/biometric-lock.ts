export const BIOMETRIC_LOCK_KEY = "dh.biometricLock";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function isBiometricLockEnabled(): boolean {
  if (!canUseStorage()) return false;
  return window.localStorage.getItem(BIOMETRIC_LOCK_KEY) === "1";
}

export function setBiometricLockEnabled(enabled: boolean): void {
  if (!canUseStorage()) return;
  if (enabled) {
    window.localStorage.setItem(BIOMETRIC_LOCK_KEY, "1");
  } else {
    window.localStorage.removeItem(BIOMETRIC_LOCK_KEY);
  }
}
