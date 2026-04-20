# Native App Setup

## Deep Links

### iOS (Universal Links)
1. Replace `TEAM_ID` in `public/.well-known/apple-app-site-association` with your Apple Team ID
2. In Xcode: Signing & Capabilities → Add "Associated Domains" → add `applinks:diamondheart.app`

### Android (App Links)
1. Replace `REPLACE_WITH_YOUR_SHA256_FINGERPRINT` in `public/.well-known/assetlinks.json`
2. Get fingerprint: `keytool -list -v -keystore your-keystore.jks`

## Biometric Login
Available automatically on devices with Face ID / Touch ID / fingerprint.
Uses `@aparajita/capacitor-biometric-auth`. Falls back to device PIN if biometrics unavailable.

To wire up: after successful password login, store a flag in secure storage. On next app launch, if flag exists, prompt biometrics instead of password form.

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

### iOS
1. Enable Push Notifications capability in Xcode
2. Create an APN key in Apple Developer portal
3. Configure your push server with the key

### Android
1. Set up Firebase Cloud Messaging
2. Add `google-services.json` to `android/app/`
3. The `@capacitor/push-notifications` plugin handles registration
