import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs against a throwaway Neon branch, provisioned by scripts/e2e-db.ts.
 * Use `pnpm test:e2e` — running `playwright test` directly would pick up
 * DATABASE_URL from .env and create accounts in a real database.
 */
if (process.env.E2E_DB_READY !== "1") {
  throw new Error(
    "Refusing to run: E2E_DB_READY is not set.\n" +
      "Run `pnpm test:e2e`, which provisions a disposable Neon branch first.\n" +
      "To target a specific database instead, set TEST_DATABASE_URL."
  );
}

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: process.env.CI ? 60_000 : 30_000,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Astro's dev server, locally and on CI: the Vercel adapter's build output is
  // not runnable outside Vercel, and Vite's on-demand compile is fast enough
  // that `gotoReady`'s hydration wait covers the first hit of each page.
  // `--ignore-lock` keeps it in the foreground: Astro 7 daemonises the dev
  // server when it detects an agent-driven shell, and Playwright needs the
  // process it started to be the server.
  webServer: {
    command: `pnpm exec astro dev --port ${PORT} --host 127.0.0.1 --ignore-lock`,
    url: baseURL,
    // Better Auth checks every browser call's Origin against its base URL, and
    // the server would otherwise report its own host, not the one Playwright connects to.
    // Its rate limiter would refuse the suite's one-sign-up-per-spec pace.
    env: { ...process.env, BETTER_AUTH_URL: baseURL, AUTH_RATE_LIMIT: "off" },
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
