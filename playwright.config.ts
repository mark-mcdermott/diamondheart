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
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: isCI ? 60_000 : 30_000,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // dev compiles routes on demand, which is fine locally but times out on a cold
  // CI runner. CI builds first (see the e2e job) and serves the production output.
  webServer: {
    command: isCI
      ? `pnpm exec next start --port ${PORT}`
      : `pnpm exec next dev --port ${PORT}`,
    url: baseURL,
    // Better Auth checks every browser call's Origin against its base URL, and
    // Next reports the server's own host, not the one Playwright connects to.
    // Its rate limiter would refuse the suite's one-sign-up-per-spec pace.
    env: { ...process.env, BETTER_AUTH_URL: baseURL, AUTH_RATE_LIMIT: "off" },
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
