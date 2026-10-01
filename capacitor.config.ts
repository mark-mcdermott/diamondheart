import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Apple Health is read on the iPhone only, but its plugin also carries Health
 * Connect code for Android: that wants API 26 where this app supports 24, so
 * the Android build fails outright, and it adds health permissions to the
 * manifest that Play asks to be justified. Capacitor can only include, not
 * exclude, so Android gets an explicit list. `capacitor-plugins.test.ts` fails
 * when a plugin is installed and named in neither.
 */
export const IOS_ONLY_PLUGINS = ["@capgo/capacitor-health"];

export const ANDROID_PLUGINS = [
  "@aparajita/capacitor-biometric-auth",
  "@capacitor/app",
  "@capacitor/haptics",
  "@capacitor/keyboard",
  "@capacitor/network",
  "@capacitor/preferences",
  "@capacitor/push-notifications",
  "@capacitor/splash-screen",
  "@capacitor/status-bar",
];

const config: CapacitorConfig = {
  appId: "app.diamondheart.mobile",
  appName: "Diamondheart",
  // The bundled applet (docs/PORT-PLAN.md, Phase 5): `pnpm build:native` writes it.
  webDir: "dist-native",
  ios: {
    scheme: "Diamondheart",
    // The page handles the safe areas itself (`html` padding from `env()` in
    // global.css, the same as the installed web app). Letting the webview inset
    // as well doubled the top gap whenever the keyboard came and went.
    contentInset: "never",
    preferredContentMode: "mobile",
    allowsLinkPreview: false,
  },
  android: {
    includePlugins: ANDROID_PLUGINS,
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#FFFBF7",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashImmersive: true,
      splashFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    Keyboard: {
      // The webview frame shrinks for the keyboard and grows back; resizing the
      // body instead left the page offset by the status bar after typing.
      resize: "native",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
