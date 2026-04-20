import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.diamondheart.mobile",
  appName: "Diamondheart",
  server: {
    url: "https://diamondheart.app",
    cleartext: false,
  },
  ios: {
    scheme: "Diamondheart",
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
};

export default config;
