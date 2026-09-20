import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSessionToken } from "@/lib/session-token";
import type { ApiContext, ApiHandler } from "@/server/api/_lib/context";

export interface TestUser {
  id: string;
  email: string;
  token: string;
}

/** A real user row, so ownership checks run against the database, not a mock. */
export async function createUser(): Promise<TestUser> {
  const id = crypto.randomUUID();
  const email = `api-${id.slice(0, 8)}@example.test`;
  await db.insert(users).values({ id, email, passwordHash: "not-a-real-hash", name: "API Test" });
  return { id, email, token: await createSessionToken(id) };
}

/** Cascades through every table with a `user_id`. */
export async function deleteUser(user: TestUser): Promise<void> {
  await db.delete(users).where(eq(users.id, user.id));
}

interface CallOptions {
  method?: string;
  body?: unknown;
  /** Raw body, for sending something that is not JSON. */
  rawBody?: string;
  as?: TestUser;
  /** Send the token as `Authorization: Bearer` instead of the cookie. */
  bearer?: boolean;
  params?: Record<string, string>;
}

/**
 * Calls a handler the way the framework adapter would, with a real `Request`.
 * No HTTP server is involved, which keeps the suite fast and framework-free.
 */
export async function call(
  handler: ApiHandler,
  path: string,
  { method = "GET", body, rawBody, as, bearer = false, params = {} }: CallOptions = {}
): Promise<{ status: number; json: unknown }> {
  const headers = new Headers();
  if (as) {
    if (bearer) headers.set("authorization", `Bearer ${as.token}`);
    else headers.set("cookie", `session=${as.token}`);
  }
  let init: RequestInit = { method, headers };
  if (rawBody !== undefined) {
    headers.set("content-type", "application/json");
    init = { ...init, body: rawBody };
  } else if (body !== undefined) {
    headers.set("content-type", "application/json");
    init = { ...init, body: JSON.stringify(body) };
  }

  const context: ApiContext = { request: new Request(`http://test.local${path}`, init), params };
  const response = await handler(context);
  const text = await response.text();
  return { status: response.status, json: text ? JSON.parse(text) : null };
}
