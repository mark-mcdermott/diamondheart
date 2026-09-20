import { defineConfig } from "vitest/config";
import { resolve } from "path";

/**
 * API integration tests. They hit a real database, so they are not part of
 * `pnpm test:unit`; run them with `pnpm test:api`, which provisions a Neon
 * branch the same way the e2e suite does (or set TEST_DATABASE_URL).
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/api/**/*.test.ts"],
    setupFiles: ["tests/api/setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
