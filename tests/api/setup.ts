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

process.env.BETTER_AUTH_SECRET ??= "api-test-secret";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";

/*
 * Off here for the same reason it is off for Playwright: these tests sign up and then
 * act as that user, and there is no mailbox to collect a verification link from. With
 * the gate on, every suite that needs an authenticated user fails at sign-in — 17 of
 * them did, which is how this was found.
 *
 * It is set here rather than in the vitest config because the gate is read from
 * `process.env` at auth-instance construction, and this setup file runs first.
 */
process.env.AUTH_REQUIRE_VERIFICATION ??= "off";
