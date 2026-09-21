import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * The native bundle (docs/PORT-PLAN.md, Phase 5): the applet as static files
 * for Capacitor's `webDir` and Tauri's `frontendDist`, built with `--mode
 * native` so `.env.native` stamps `NEXT_PUBLIC_NATIVE=1` and the production
 * `NEXT_PUBLIC_API_BASE`. Set `NEXT_PUBLIC_API_BASE` in the environment to aim
 * a build at a local server instead.
 */
export default defineConfig({
  root: "native",
  envDir: "..",
  envPrefix: ["PUBLIC_", "NEXT_PUBLIC_"],
  publicDir: resolve(__dirname, "public"),
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": resolve(__dirname, "src") } },
  build: { outDir: resolve(__dirname, "dist-native"), emptyOutDir: true },
});
