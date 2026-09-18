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
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm exec next dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
