import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { auth } from "@/lib/server/auth";
import * as authApi from "@/server/api/auth";
import { call, createUser, deleteUser, TEST_PASSWORD, type TestUser } from "./support";

describe("GET /api/auth/me", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await createUser();
  });

  afterAll(async () => {
    await deleteUser(user);
  });

  it("is 200 with a null user when nobody is signed in", async () => {
    const res = await call(authApi.GET, "/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.json).toEqual({ user: null });
  });

  it("returns the signed-in user from a bearer token", async () => {
    const res = await call(authApi.GET, "/api/auth/me", { as: user });
    expect(res.status).toBe(200);
    expect(res.json).toEqual({
      user: { id: user.id, email: user.email, name: "API Test", avatarUrl: null },
    });
  });

  it("returns the same user from the signed cookie", async () => {
    const res = await call(authApi.GET, "/api/auth/me", { as: user, cookie: true });
    expect(res.status).toBe(200);
    expect((res.json as { user: { id: string } }).user.id).toBe(user.id);
  });

  it("treats a garbage token as signed out, not as an error", async () => {
    const forged = { ...user, token: "not-a-session" };
    const res = await call(authApi.GET, "/api/auth/me", { as: forged });
    expect(res.status).toBe(200);
    expect(res.json).toEqual({ user: null });
  });

  it("treats a token for a deleted account as signed out", async () => {
    const gone = await createUser();
    await deleteUser(gone);
    const res = await call(authApi.GET, "/api/auth/me", { as: gone });
    expect(res.status).toBe(200);
    expect(res.json).toEqual({ user: null });
  });
});

describe("sign-in", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await createUser();
  });

  afterAll(async () => {
    await deleteUser(user);
  });

  it("signs in with the password that was set at sign-up and issues a bearer token", async () => {
    const { headers, response } = await auth.api.signInEmail({
      body: { email: user.email, password: TEST_PASSWORD },
      returnHeaders: true,
    });
    expect(response.user.id).toBe(user.id);
    expect(headers.get("set-auth-token")).toBeTruthy();
  });

  it("refuses a wrong password without saying which half was wrong", async () => {
    await expect(auth.api.signInEmail({ body: { email: user.email, password: "nope-nope-nope" } })).rejects.toMatchObject({
      status: "UNAUTHORIZED",
    });
    await expect(auth.api.signInEmail({ body: { email: "nobody@example.test", password: "nope-nope-nope" } })).rejects.toMatchObject({
      status: "UNAUTHORIZED",
    });
  });

  it("signs out, after which the token is dead", async () => {
    const throwaway = await createUser();
    await auth.api.signOut({ headers: new Headers({ authorization: `Bearer ${throwaway.token}` }) });
    const res = await call(authApi.GET, "/api/auth/me", { as: throwaway });
    expect(res.json).toEqual({ user: null });
    await deleteUser(throwaway);
  });
});
