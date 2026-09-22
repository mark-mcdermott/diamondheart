import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

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

  const original = readFileSync(plistPath, "utf8");
  const missing = Object.entries(REQUIRED_KEYS).filter(([key]) => !original.includes(`<key>${key}</key>`));
  if (missing.length === 0) return "unchanged";

  const closing = original.lastIndexOf("</dict>");
  if (closing === -1) return "unchanged";

  const entries = missing.map(([key, value]) => `\t<key>${key}</key>\n\t<string>${value}</string>\n`).join("");
  writeFileSync(plistPath, original.slice(0, closing) + entries + original.slice(closing), "utf8");
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
