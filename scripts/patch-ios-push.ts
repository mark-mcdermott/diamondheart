import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { plistString, withPlistEntries } from "./plist";

/**
 * What remote notifications need that the generated iOS project does not
 * carry, applied after every `cap sync` because `ios/` is not in git:
 *
 * - the `aps-environment` entitlement, without which registering for push
 *   fails on a device (Xcode signs a distribution build with `production`
 *   whatever this file says);
 * - `CODE_SIGN_ENTITLEMENTS` on the app target, so the file is used;
 * - the two `AppDelegate` callbacks that hand APNs' answer to Capacitor, or
 *   the plugin's `registration` event never fires.
 */
const IOS_APP = resolve(process.cwd(), "ios/App");
const ENTITLEMENTS_FILE = "App/App.entitlements";

export const REQUIRED_ENTITLEMENTS: Record<string, string> = {
  "aps-environment": plistString("development"),
};

const EMPTY_ENTITLEMENTS = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
</dict>
</plist>
`;

const APP_TARGET_SETTING = /^(\s*)INFOPLIST_FILE = App\/Info\.plist;$/gm;

const REGISTRATION_CALLBACKS = `
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }
`;

export type PatchResult = "missing" | "patched" | "unchanged";

function rewrite(path: string, patch: (original: string) => string | null): PatchResult {
  if (!existsSync(path)) return "missing";
  const patched = patch(readFileSync(path, "utf8"));
  if (patched === null) return "unchanged";
  writeFileSync(path, patched, "utf8");
  return "patched";
}

export function patchEntitlements(appDir = IOS_APP): PatchResult {
  if (!existsSync(appDir)) return "missing";
  const path = resolve(appDir, ENTITLEMENTS_FILE);
  if (!existsSync(path)) writeFileSync(path, EMPTY_ENTITLEMENTS, "utf8");
  return rewrite(path, (original) => withPlistEntries(original, REQUIRED_ENTITLEMENTS));
}

export function patchCodeSignEntitlements(projectPath = resolve(IOS_APP, "App.xcodeproj/project.pbxproj")): PatchResult {
  return rewrite(projectPath, (original) => {
    if (original.includes("CODE_SIGN_ENTITLEMENTS")) return null;
    const patched = original.replace(APP_TARGET_SETTING, `$1CODE_SIGN_ENTITLEMENTS = ${ENTITLEMENTS_FILE};\n$&`);
    return patched === original ? null : patched;
  });
}

export function patchAppDelegate(delegatePath = resolve(IOS_APP, "App/AppDelegate.swift")): PatchResult {
  return rewrite(delegatePath, (original) => {
    if (original.includes("capacitorDidRegisterForRemoteNotifications")) return null;
    const classEnd = original.lastIndexOf("}");
    if (classEnd === -1) return null;
    return `${original.slice(0, classEnd).trimEnd()}\n${REGISTRATION_CALLBACKS}${original.slice(classEnd)}`;
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const results = {
    entitlements: patchEntitlements(),
    "code signing": patchCodeSignEntitlements(),
    AppDelegate: patchAppDelegate(),
  };
  for (const [what, result] of Object.entries(results)) {
    const outcome = result === "missing" ? "ios/ not generated yet — skipping" : result === "patched" ? "patched" : "already patched — no changes";
    console.log(`[patch-ios-push] ${what}: ${outcome}`);
  }
}
