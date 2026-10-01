import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { patchAppDelegate, patchCodeSignEntitlements, patchEntitlements } from "../../../scripts/patch-ios-capabilities";

const PROJECT = `		504EC3171FED79650016851F /* Debug */ = {
			buildSettings = {
				CODE_SIGN_STYLE = Automatic;
				INFOPLIST_FILE = App/Info.plist;
			};
			name = Debug;
		};
		504EC3181FED79650016851F /* Release */ = {
			buildSettings = {
				CODE_SIGN_STYLE = Automatic;
				INFOPLIST_FILE = App/Info.plist;
			};
			name = Release;
		};
`;

const DELEGATE = `import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

}
`;

let appDir: string;

beforeEach(() => {
  appDir = mkdtempSync(join(tmpdir(), "patch-ios-capabilities-"));
  mkdirSync(join(appDir, "App"));
});

afterEach(() => {
  rmSync(appDir, { recursive: true, force: true });
});

describe("patchEntitlements", () => {
  const entitlements = () => readFileSync(join(appDir, "App/App.entitlements"), "utf8");

  it("returns 'missing' when the iOS project does not exist", () => {
    expect(patchEntitlements(join(appDir, "nope"))).toBe("missing");
  });

  it("creates the entitlements file with push and HealthKit", () => {
    expect(patchEntitlements(appDir)).toBe("patched");
    expect(entitlements()).toContain("<key>aps-environment</key>\n\t<string>development</string>");
    expect(entitlements()).toContain("<key>com.apple.developer.healthkit</key>\n\t<true/>");
    expect(entitlements().indexOf("aps-environment")).toBeLessThan(entitlements().lastIndexOf("</dict>"));
  });

  it("keeps entitlements that are already there, and is idempotent", () => {
    writeFileSync(
      join(appDir, "App/App.entitlements"),
      `<plist version="1.0">\n<dict>\n\t<key>com.apple.developer.associated-domains</key>\n\t<array/>\n</dict>\n</plist>\n`,
      "utf8"
    );
    expect(patchEntitlements(appDir)).toBe("patched");
    expect(patchEntitlements(appDir)).toBe("unchanged");
    expect(entitlements()).toContain("com.apple.developer.associated-domains");
    expect(entitlements().match(/aps-environment/g)).toHaveLength(1);
  });
});

describe("patchCodeSignEntitlements", () => {
  it("points both configurations of the app target at the entitlements file", () => {
    const projectPath = join(appDir, "project.pbxproj");
    writeFileSync(projectPath, PROJECT, "utf8");
    expect(patchCodeSignEntitlements(projectPath)).toBe("patched");
    expect(readFileSync(projectPath, "utf8").match(/\t\t\t\tCODE_SIGN_ENTITLEMENTS = App\/App\.entitlements;\n/g)).toHaveLength(2);
    expect(patchCodeSignEntitlements(projectPath)).toBe("unchanged");
  });

  it("returns 'missing' without a project", () => {
    expect(patchCodeSignEntitlements(join(appDir, "nope.pbxproj"))).toBe("missing");
  });
});

describe("patchAppDelegate", () => {
  it("adds the registration callbacks inside the class, once", () => {
    const delegatePath = join(appDir, "App/AppDelegate.swift");
    writeFileSync(delegatePath, DELEGATE, "utf8");
    expect(patchAppDelegate(delegatePath)).toBe("patched");
    const patched = readFileSync(delegatePath, "utf8");
    expect(patched).toContain("didRegisterForRemoteNotificationsWithDeviceToken");
    expect(patched).toContain("didFailToRegisterForRemoteNotificationsWithError");
    expect(patched.trimEnd().endsWith("}")).toBe(true);
    expect(patchAppDelegate(delegatePath)).toBe("unchanged");
  });
});
