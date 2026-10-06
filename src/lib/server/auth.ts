import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import { db } from "@/db";
import { account, session, users, verification } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/password";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/server/email";
import { NATIVE_ORIGINS } from "@/lib/server/origins";

/**
 * Better Auth (Phase 2 of docs/PORT-PLAN.md, Decision 2).
 *
 * - `users` is the existing table, mapped in by model name; `avatarUrl` is its
 *   `image`. Its `id` was already a text UUID, so identity did not change.
 * - Passwords stay bcrypt through the custom hasher, so the hashes that exist
 *   keep working and nothing had to be reset. Better Auth reads the hash from
 *   `account.password`; `scripts/migrate-better-auth.ts` backfills that row.
 * - `bearer()` is what a bundled native build authenticates with: the sign-in
 *   response carries `set-auth-token`, and `Authorization: Bearer` resolves it.
 * - The browser client (`src/lib/auth-client.ts`) signs in, up and out over
 *   `/api/auth/*`, so the cookie is set by the handler's own response.
 */

const LOCAL_URL = "http://localhost:3000";

/**
 * Explicit where the deployment sets it; otherwise left for Better Auth to read
 * off each request. A hard-coded fallback would make the browser's calls fail
 * the origin check anywhere that is not that exact host, which the e2e server
 * on 127.0.0.1 found the moment the forms stopped going through server actions.
 */
function baseURL(): string | undefined {
  return process.env.BETTER_AUTH_URL ?? process.env.PUBLIC_APP_URL ?? undefined;
}

/**
 * Vercel's per-deploy hosts, so sign-in works on previews without configuration,
 * and the native shells' local origins: the bundle signs in from a webview whose
 * origin is not the site's (Decision 9). Those calls carry no cookie, so a
 * cross-site form could not forge them; what the origin check protects is the
 * cookie session, and it still does.
 */
function trustedOrigins(): string[] {
  const origins = [LOCAL_URL, ...NATIVE_ORIGINS];
  for (const host of [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]) {
    if (host) origins.push(`https://${host}`);
  }
  return origins;
}

export const auth = betterAuth({
  appName: "Diamondheart",
  baseURL: baseURL(),
  // Nothing is sealed under it yet; it becomes permanent the moment passkeys or
  // TOTP arrive. Rotating it signs every session out once.
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: trustedOrigins(),

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { users, session, account, verification },
  }),

  user: {
    modelName: "users",
    fields: { image: "avatarUrl" },
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    password: {
      hash: hashPassword,
      verify: ({ password, hash }) => verifyPassword(password, hash),
    },
    /**
     * Until this landed there was no way back into an account: password was the only
     * credential (the biometric lock is a local convenience, not account recovery), and
     * nothing sent mail, so a forgotten password was permanent.
     *
     * Unlike `sendVerificationEmail` below, this is not a background task — a failed send
     * reaches the caller, so the form can say so instead of claiming the mail is on its way.
     */
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, url);
    },
    /*
     * See the note on `emailVerification` below for why this waited, and for what.
     *
     * Off for the e2e server only, the same shape as `AUTH_RATE_LIMIT` below and for the same
     * reason: Playwright signs up per spec and has no mailbox to collect a link from, so the
     * gate would block every test rather than test anything. The cost is that the gate itself
     * is not covered by e2e — the flows behind it are.
     */
    requireEmailVerification: process.env.AUTH_REQUIRE_VERIFICATION !== "off",
  },

  /**
   * `requireEmailVerification` is on as of 2026-10-05, and the order it waited for matters.
   *
   * It was off when the mail first landed, because every row then had `emailVerified = false`
   * and requiring it would have locked out every account including Mark's. Two things had to
   * be true first, and now are:
   *
   * 1. **Both existing accounts are verified** — one through the flow, one set directly.
   * 2. **There is a way back from a failed send.** Better Auth runs `sendVerificationEmail`
   *    as a background task, so a failure is logged and never reaches the request: sign-up
   *    answers 200 and creates the account with no mail sent. With this flag on, that person
   *    cannot sign in either. `CheckInbox` is the answer — sign-up and a refused sign-in both
   *    land there, and it offers a resend rather than leaving them to guess.
   *
   * Turning this on without (2) would have converted a silent non-delivery into a locked
   * account with no self-serve recovery.
   */
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url);
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },

  // On in production, as Better Auth defaults it. The e2e server runs the
  // production build and signs up once per spec from one address, which the
  // sign-up rule (a few per ten seconds) refuses, so Playwright sets
  // AUTH_RATE_LIMIT=off for that server and nothing else does.
  rateLimit: {
    enabled: process.env.NODE_ENV === "production" && process.env.AUTH_RATE_LIMIT !== "off",
  },

  advanced: {
    database: { generateId: () => crypto.randomUUID() },
  },

  plugins: [bearer()],
});

export type Auth = typeof auth;
