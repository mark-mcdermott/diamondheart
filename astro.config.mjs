// @ts-check
import "dotenv/config";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";

/**
 * The Astro shell (docs/PORT-PLAN.md, Phase 4).
 *
 * `dotenv/config` is what puts `.env` into `process.env` for `astro dev`: Astro
 * loads `.env` into its own layer only, and the server modules (`src/db`,
 * `src/lib/server/*`) read `process.env`, the same way they do on Vercel where
 * the variables are real. Client-side reads keep their `NEXT_PUBLIC_` names
 * through `envPrefix`, so the Vercel project needs no renaming.
 *
 * Every page is prerendered unless it says otherwise; the API endpoints and the
 * section pages that mount the applet opt out with `prerender = false`.
 */
export default defineConfig({
  site: "https://www.diamondheart.app",
  adapter: vercel(),
  integrations: [react()],
  server: { port: 3000 },
  vite: {
    plugins: [tailwindcss()],
    envPrefix: ["PUBLIC_", "NEXT_PUBLIC_"],
  },
});
