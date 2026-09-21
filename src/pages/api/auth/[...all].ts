import type { APIRoute } from "astro";
import { auth } from "@/lib/server/auth";

export const prerender = false;

/**
 * Every Better Auth route: sign-in, sign-up, sign-out, get-session and the
 * rest, under `/api/auth/*`. `/api/auth/me` is our own file and, being a
 * static route, wins over this rest segment.
 */
const handle: APIRoute = ({ request }) => auth.handler(request);

export const GET = handle;
export const POST = handle;
