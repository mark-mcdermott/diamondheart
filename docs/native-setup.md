# Native App Setup

## Deep Links

### iOS (Universal Links)
1. Replace `TEAM_ID` in `public/.well-known/apple-app-site-association` with your Apple Team ID
2. In Xcode: Signing & Capabilities → Add "Associated Domains" → add both `applinks:www.diamondheart.app` and `applinks:diamondheart.app` — www is canonical, but the apex resolves too and is what people type

### Android (App Links)
1. Replace `REPLACE_WITH_YOUR_SHA256_FINGERPRINT` in `public/.well-known/assetlinks.json`
2. Get fingerprint: `keytool -list -v -keystore your-keystore.jks`

## Biometric Lock
**Verified on the simulator 2026-09-22.** Account → Biometric unlock turns it on
(`src/components/biometric-unlock-toggle.tsx`); `src/components/biometric-lock-gate.tsx`
then locks the applet on launch and whenever it leaves the foreground, and unlocks
through `@aparajita/capacitor-biometric-auth` with the device passcode as fallback.
Turning it off from the lock screen also needs a successful check.

Two things the plugin needs that the generated projects do not carry:

- iOS: `NSFaceIDUsageDescription` in `Info.plist`, or `checkBiometry` reports Face ID as
  unavailable and the toggle never appears. `pnpm cap:sync` applies it through
  `scripts/patch-ios-info.ts`, since `ios/` is not in git.
- The system prompt takes the app inactive and hands it back; `biometricPromptSettling()`
  in `src/lib/biometrics.ts` is what stops the gate treating that as a return from the
  background and locking again the moment it unlocked.

The lock protects the signed-in applet, not the sign-in screen: there is nothing to
protect before there is a session.

## Splash Screen
The splash uses `backgroundColor: #FFFBF7` (warm cream).

### iOS
Add a branded launch storyboard in Xcode:
1. Open `ios/App/App/Base.lproj/LaunchScreen.storyboard`
2. Add an ImageView with the logo centered, background color `#FFFBF7`

### Android
Edit `android/app/src/main/res/values/styles.xml`:
```xml
<style name="AppTheme.NoActionBar" parent="Theme.AppCompat.NoActionBar">
    <item name="android:background">#FFFBF7</item>
</style>
```

## Share Extension (iOS)
Requires native Xcode target:
1. File → New → Target → Share Extension
2. Configure to share meditation streaks / achievement images
3. Use App Groups to share data between main app and extension

## iOS Widget
Requires native WidgetKit target:
1. File → New → Target → Widget Extension
2. Create a simple widget showing today's progress ring
3. Use App Groups + shared UserDefaults for data

## Push Notifications

The applet asks for permission and registers once a user is signed in
(`src/app/AppShell.tsx` → `src/lib/native-push.ts`), waits at most 15 s for a
token, and stores it through `POST /api/push/device-token`. Tapping a
notification opens the path it carries, and only a path.

`sendPushToUser()` in `src/lib/server/push.ts` reaches every address a user has:
browser subscriptions over web push, iPhones over APNs (`apns.ts`), Android over
FCM (`fcm.ts`). A channel the deployment holds no credentials for is skipped, and
only an address its own service disowns is deleted. Settings → Notifications has
a "Send test" button (`POST /api/push/test`) that pushes to the caller's own
devices and says how it went.

| Channel | Environment variables |
|---|---|
| APNs | `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY` (the `.p8` text), optionally `APNS_BUNDLE_ID` |
| FCM | `FCM_SERVICE_ACCOUNT` (the service account JSON, whole) |
| Web push | `PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` |

### iOS
`pnpm cap:sync` applies what the generated project lacks through
`scripts/patch-ios-capabilities.ts`: the `aps-environment` entitlement, the build
setting that points at it, and the two `AppDelegate` callbacks that hand APNs'
answer to Capacitor. With automatic signing, the first build after that
registers the explicit App ID with the push capability.

One APNs key (Apple Developer → Keys → Apple Push Notifications service) serves
both environments. A build run from Xcode gets a sandbox token and a TestFlight
or App Store build a production one; the sender tries production, then the
sandbox, so neither needs configuring.

### Android
**Written against FCM's HTTP v1 API and unit-tested, never run against Google:**
there is no Firebase project yet.
1. Create the Firebase project and add the Android app (`app.diamondheart.mobile`)
2. Add `google-services.json` to `android/app/` (absent today; the Gradle file
   skips the plugin without it, so registration fails at runtime)
3. Set `FCM_SERVICE_ACCOUNT` from the project's service account key

## HealthKit

**Verified on the simulator 2026-10-01.** Account → Integrations → Apple Health
asks for read access, marks the account connected and syncs. After that the
iPhone build syncs on launch and whenever it returns to the foreground, at most
hourly (`src/hooks/use-health-auto-sync.ts`), and "Sync Now" does it on demand.

What a sync does:

- `src/lib/health.ts` reads the last seven days through
  `@capgo/capacitor-health`: day totals for steps and active energy, raw
  samples for resting heart rate, HRV, blood oxygen and sleep.
- `src/lib/health-summary.ts` turns those into one reading per metric per
  calendar day. Sleep is the hours asleep, counted once where a watch and a
  phone both recorded the night, and a night belongs to the day it ends on.
- `POST /api/integrations/healthkit/sync` stores each reading as an entry on
  the account's hidden Biometrics metrics, replacing the one Health gave for
  that metric and day before. Resending a day is therefore safe, and today's
  totals grow through the day instead of freezing at the first sync.

Two things worth knowing:

- iOS never says whether read access was granted. A denied type simply reads
  as empty, so "connected" means the sheet was answered, not that data flows.
- `pnpm cap:sync` applies what the generated project lacks: the HealthKit
  entitlement (`scripts/patch-ios-capabilities.ts`) and the two usage strings
  (`scripts/patch-ios-info.ts`). The app only reads; the update string is
  there because App Store validation asks for it of any binary that links the
  write API, which the plugin does.

The plugin also speaks Health Connect on Android. Nothing here uses that yet:
the card is offered on the iPhone build only.
