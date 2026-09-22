import type { CapacitorConfig } from "@capacitor/cli";

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
