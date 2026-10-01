// @ts-check
import "dotenv/config";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { NATIVE_ORIGINS } from "./src/lib/server/origins.ts";

/**
 * The Astro shell (docs/PORT-PLAN.md, Phase 4).
 *
 * `dotenv/config` is what puts `.env` into `process.env` for `astro dev`: Astro
 * loads `.env` into its own layer only, and the server modules (`src/db`,
 * `src/lib/server/*`) read `process.env`, the same way they do on Vercel where
 * the variables are real. What the client may read is named `PUBLIC_*`, Astro's
 * own convention, and reaches it through `import.meta.env`.
 *
 * Every page is prerendered unless it says otherwise; the API endpoints and the
 * section pages that mount the applet opt out with `prerender = false`.
 */
/**
 * `astro dev` refuses cross-site subresource requests unless their origin is an
 * allowed domain, and a native build pointed at it (`PUBLIC_API_BASE=
 * http://localhost:3000 pnpm build:native`) is exactly that. The same list also
 * decides which `X-Forwarded-Host` values SSR trusts, which no deployment
 * needs, so it is set for the dev server only.
 */
const isDev = process.argv.includes("dev");
const nativeDomains = NATIVE_ORIGINS.map((origin) => {
  const url = new URL(origin);
  return { hostname: url.hostname, protocol: url.protocol.slice(0, -1) };
});

export default defineConfig({
  site: "https://www.diamondheart.app",
  adapter: vercel(),
  integrations: [react()],
  server: { port: 3000 },
  security: { allowedDomains: isDev ? nativeDomains : [] },
  vite: {
    plugins: [tailwindcss()],
    // Vite's dev-only CORS layer answers preflights itself and would hide
    // `src/middleware.ts` from a native build pointed at `astro dev`; off, so dev
    // and Vercel behave the same and only that middleware speaks CORS.
    server: { cors: false },
  },
});
