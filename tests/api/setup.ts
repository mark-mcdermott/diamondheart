/**
 * Refuses to run against production, and gives the auth instance what it needs.
 *
 * `scripts/e2e-db.ts` sets DATABASE_URL to a throwaway branch; TEST_DATABASE_URL
 * points wherever the developer says. Neither should ever be the production
 * host — see CLAUDE.md, "Neon branches".
 */
const url = process.env.DATABASE_URL ?? "";
if (!url) {
  throw new Error("DATABASE_URL is not set. Run these through `pnpm test:api`.");
}
if (url.includes("ep-patient-fire")) {
  throw new Error("Refusing to run API tests against the production database.");
}

process.env.AUTH_SECRET ??= "api-test-secret";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
