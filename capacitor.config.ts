import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.diamondheart.mobile",
  appName: "Diamondheart",
  server: {
    url: "https://www.diamondheart.app",
    cleartext: false,
  },
  ios: {
    scheme: "Diamondheart",
    contentInset: "always",
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
      resize: "body",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
