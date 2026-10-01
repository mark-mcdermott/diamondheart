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
| Web push | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` |

### iOS
`pnpm cap:sync` applies what the generated project lacks through
`scripts/patch-ios-push.ts`: the `aps-environment` entitlement, the build
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

**There is no HealthKit integration yet, only its outline.** No plugin is
installed, `Info.plist` carries no `NSHealthShareUsageDescription`, and the
project has no `com.apple.developer.healthkit` entitlement. The "HealthKit" card
under Account → Integrations posts only today's date to
`/api/integrations/healthkit/sync`, which accepts step, heart-rate, HRV, sleep,
calorie and SpO2 fields it never receives, so a sync writes nothing and marks the
day done. Building it means: a HealthKit plugin, the two usage strings and the
entitlement, reading the samples on the device, and posting them in that shape.
