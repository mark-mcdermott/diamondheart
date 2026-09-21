import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/server/auth";
import type { ApiContext, ApiHandler } from "@/server/api/_lib/context";

export interface TestUser {
  id: string;
  email: string;
  password: string;
  /** The session token, sent as `Authorization: Bearer` — the native build's path. */
  token: string;
  /** The signed cookie, for the one test that exercises the browser's path. */
  cookie: string;
}

export const TEST_PASSWORD = "correct-horse-battery";

/**
 * A real account through Better Auth's own sign-up, so the session is real and
 * every ownership check runs against the database, not a mock.
 */
export async function createUser(): Promise<TestUser> {
  const email = `api-${crypto.randomUUID().slice(0, 8)}@example.test`;
  const { headers, response } = await auth.api.signUpEmail({
    body: { name: "API Test", email, password: TEST_PASSWORD },
    returnHeaders: true,
  });
  const token = headers.get("set-auth-token");
  const cookie = headers.getSetCookie().find((c) => c.includes("session_token"))?.split(";")[0];
  if (!token || !cookie) throw new Error("sign-up returned no session");
  return { id: response.user.id, email, password: TEST_PASSWORD, token, cookie };
}

/** Cascades through every table with a `user_id`, sessions and accounts included. */
export async function deleteUser(user: TestUser): Promise<void> {
  await db.delete(users).where(eq(users.id, user.id));
}

interface CallOptions {
  method?: string;
  body?: unknown;
  /** Raw body, for sending something that is not JSON. */
  rawBody?: string;
  as?: TestUser;
  /** Send the signed cookie instead of the bearer header. */
  cookie?: boolean;
  params?: Record<string, string>;
}

/**
 * Calls a handler the way the framework adapter would, with a real `Request`.
 * No HTTP server is involved, which keeps the suite fast and framework-free.
 */
export async function call(
  handler: ApiHandler,
  path: string,
  { method = "GET", body, rawBody, as, cookie = false, params = {} }: CallOptions = {}
): Promise<{ status: number; json: unknown }> {
  const headers = new Headers();
  if (as) {
    if (cookie) headers.set("cookie", as.cookie);
    else headers.set("authorization", `Bearer ${as.token}`);
  }
  let init: RequestInit = { method, headers };
  if (rawBody !== undefined) {
    headers.set("content-type", "application/json");
    init = { ...init, body: rawBody };
  } else if (body !== undefined) {
    headers.set("content-type", "application/json");
    init = { ...init, body: JSON.stringify(body) };
  }

  const context: ApiContext = { request: new Request(`http://localhost:3000${path}`, init), params };
  const response = await handler(context);
  const text = await response.text();
  return { status: response.status, json: text ? JSON.parse(text) : null };
}
