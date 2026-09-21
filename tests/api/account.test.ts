import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/server/auth";
import * as account from "@/server/api/account";
import { call, createUser, deleteUser, TEST_PASSWORD, type TestUser } from "./support";

type Failure = { error: string; fields?: Record<string, string[]> };

describe("account", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await createUser();
  });

  afterAll(async () => {
    await deleteUser(user);
  });

  it("answers 401 without a session", async () => {
    expect((await call(account.password.PATCH, "/api/account/password", { method: "PATCH", body: { currentPassword: "x", newPassword: "12345678" } })).status).toBe(401);
    expect((await call(account.avatar.DELETE, "/api/account/avatar", { method: "DELETE" })).status).toBe(401);
  });

  it("changes the password only when the current one is right and the new one is long enough", async () => {
    const short = await call(account.password.PATCH, "/api/account/password", { method: "PATCH", as: user, body: { currentPassword: TEST_PASSWORD, newPassword: "short" } });
    expect(short.status).toBe(422);
    expect(Object.keys((short.json as Failure).fields ?? {})).toEqual(["newPassword"]);

    const wrong = await call(account.password.PATCH, "/api/account/password", { method: "PATCH", as: user, body: { currentPassword: "not-it", newPassword: "new-password-1" } });
    expect(wrong.status).toBe(422);
    expect(Object.keys((wrong.json as Failure).fields ?? {})).toEqual(["currentPassword"]);

    const ok = await call(account.password.PATCH, "/api/account/password", { method: "PATCH", as: user, body: { currentPassword: TEST_PASSWORD, newPassword: "new-password-1" } });
    expect(ok.status).toBe(204);

    const signedIn = await auth.api.signInEmail({ body: { email: user.email, password: "new-password-1" } });
    expect(signedIn.user.id).toBe(user.id);
    await expect(auth.api.signInEmail({ body: { email: user.email, password: TEST_PASSWORD } })).rejects.toMatchObject({ status: "UNAUTHORIZED" });
  });

  it("removing an avatar clears the column and is idempotent", async () => {
    await db.update(users).set({ avatarUrl: "https://example.test/f/not-a-real-key" }).where(eq(users.id, user.id));
    const first = await call(account.avatar.DELETE, "/api/account/avatar", { method: "DELETE", as: user });
    expect(first.status).toBe(204);
    const [row] = await db.select({ avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, user.id));
    expect(row.avatarUrl).toBeNull();

    const again = await call(account.avatar.DELETE, "/api/account/avatar", { method: "DELETE", as: user });
    expect(again.status).toBe(204);
  });
});
