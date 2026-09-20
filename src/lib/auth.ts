import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_DURATION_SECONDS as SESSION_DURATION,
  createSessionToken,
  verifySessionToken,
} from "@/lib/session-token";

/** Hashing lives in `src/lib/password.ts`; re-exported so existing imports keep working. */
export { hashPassword, verifyPassword } from "@/lib/password";

export async function createSession(userId: string): Promise<string> {
  return createSessionToken(userId);
}

export async function verifySession(
  token: string
): Promise<{ userId: string } | null> {
  return verifySessionToken(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });
}

export async function getSessionCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<{ userId: string } | null> {
  const token = await getSessionCookie();
  if (!token) return null;
  return verifySession(token);
}
