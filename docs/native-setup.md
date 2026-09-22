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

**State on 2026-09-22 (checked against the bundled build):** the applet asks for
permission and registers once a user is signed in (`src/app/AppShell.tsx` →
`src/lib/native-push.ts`), waits at most 15 s for a token, and stores it through
`POST /api/push/device-token`. Nothing yet sends to those tokens: the only sender
(`src/lib/server/web-push.ts`) speaks VAPID web push, not APNs or FCM. Until a
sender exists, granting the prompt stores a token and produces no notifications.

### iOS
1. Enable the Push Notifications capability in Xcode (adds the `aps-environment`
   entitlement; the project has none today, so registration reports an error on
   a device and stays silent on the simulator)
2. Create an APNs key in the Apple Developer portal
3. Add an APNs sender next to the web-push one and call it from the same places

### Android
1. Set up Firebase Cloud Messaging
2. Add `google-services.json` to `android/app/` (absent today; the Gradle file
   skips the plugin without it, so registration fails at runtime)
3. Add an FCM sender the same way

## HealthKit

**There is no HealthKit integration yet, only its outline.** No plugin is
installed, `Info.plist` carries no `NSHealthShareUsageDescription`, and the
project has no `com.apple.developer.healthkit` entitlement. The "HealthKit" card
under Account → Integrations posts only today's date to
`/api/integrations/healthkit/sync`, which accepts step, heart-rate, HRV, sleep,
calorie and SpO2 fields it never receives, so a sync writes nothing and marks the
day done. Building it means: a HealthKit plugin, the two usage strings and the
entitlement, reading the samples on the device, and posting them in that shape.
