import { Capacitor } from "@capacitor/core";

export async function isBiometricAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
    const result = await BiometricAuth.checkBiometry();
    return result.isAvailable;
  } catch {
    return false;
  }
}

let promptOpen = false;
let promptClosedAt = 0;
// The success animation keeps the sheet up well after the plugin has answered;
// the app-state event for its dismissal was seen more than a second later.
const PROMPT_SETTLE_MS = 5000;

/**
 * True while the system prompt is up or has just closed. The prompt takes the
 * app inactive and hands it back, and those app-state events are the prompt,
 * not the user leaving; a lock that re-arms on them never lets anyone in.
 */
export function biometricPromptSettling(): boolean {
  return promptOpen || Date.now() - promptClosedAt < PROMPT_SETTLE_MS;
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  promptOpen = true;
  try {
    const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
    await BiometricAuth.authenticate({
      reason: "Unlock Diamondheart",
      cancelTitle: "Use Password",
      allowDeviceCredential: true,
    });
    return true;
  } catch {
    return false;
  } finally {
    promptOpen = false;
    promptClosedAt = Date.now();
  }
}
