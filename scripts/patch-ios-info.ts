import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { plistString, withPlistEntries } from "./plist";

/**
 * `ios/` is generated and not in git, so the Info.plist keys the app needs are
 * applied after every `cap sync`, the way `patch-android-splash.ts` does for
 * Android. Without `NSFaceIDUsageDescription` the biometric plugin reports
 * Face ID as unavailable and the lock can never be turned on.
 */
const PLIST_PATH = resolve(process.cwd(), "ios/App/App/Info.plist");

export const REQUIRED_KEYS: Record<string, string> = {
  NSFaceIDUsageDescription: "Unlock Diamondheart with Face ID.",
};

export function patchIosInfo(plistPath = PLIST_PATH): "missing" | "patched" | "unchanged" {
  if (!existsSync(plistPath)) return "missing";

  const entries = Object.fromEntries(Object.entries(REQUIRED_KEYS).map(([key, value]) => [key, plistString(value)]));
  const patched = withPlistEntries(readFileSync(plistPath, "utf8"), entries);
  if (patched === null) return "unchanged";

  writeFileSync(plistPath, patched, "utf8");
  return "patched";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = patchIosInfo();
  if (result === "missing") {
    console.log("[patch-ios-info] ios/ not generated yet — skipping");
  } else if (result === "patched") {
    console.log(`[patch-ios-info] added ${Object.keys(REQUIRED_KEYS).join(", ")} to Info.plist`);
  } else {
    console.log("[patch-ios-info] already patched — no changes");
  }
}
