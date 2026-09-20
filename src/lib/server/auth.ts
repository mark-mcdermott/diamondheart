import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { bearer } from "better-auth/plugins";
import { db } from "@/db";
import { account, session, users, verification } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/password";

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
 * - `nextCookies()` sets the cookie when a server action signs someone in. It
 *   must be the last plugin.
 */

const LOCAL_URL = "http://localhost:3000";

function baseURL(): string {
  return process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? LOCAL_URL;
}

/** Vercel's per-deploy hosts, so sign-in works on previews without configuration. */
function trustedOrigins(): string[] {
  const origins = [LOCAL_URL];
  for (const host of [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]) {
    if (host) origins.push(`https://${host}`);
  }
  return origins;
}

export const auth = betterAuth({
  appName: "Diamondheart",
  baseURL: baseURL(),
  // Falls back to the JWT secret so the existing deployment needs no new variable.
  // No passkeys or TOTP exist yet, so nothing is sealed under it; treat it as
  // permanent from the moment either is added.
  secret: process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET,
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
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },

  advanced: {
    database: { generateId: () => crypto.randomUUID() },
  },

  plugins: [bearer(), nextCookies()],
});

export type Auth = typeof auth;
