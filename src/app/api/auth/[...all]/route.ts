import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/server/auth";

/**
 * Every Better Auth route: sign-in, sign-up, sign-out, get-session and the
 * rest, under `/api/auth/*`. `/api/auth/me` is our own static route and wins
 * over this catch-all.
 */
export const { GET, POST } = toNextJsHandler(auth);
