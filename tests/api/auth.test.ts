import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as auth from "@/server/api/auth";
import { call, createUser, deleteUser, type TestUser } from "./support";

describe("GET /api/auth/me", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await createUser();
  });

  afterAll(async () => {
    await deleteUser(user);
  });

  it("is 200 with a null user when nobody is signed in", async () => {
    const res = await call(auth.GET, "/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.json).toEqual({ user: null });
  });

  it("returns the signed-in user from the cookie", async () => {
    const res = await call(auth.GET, "/api/auth/me", { as: user });
    expect(res.status).toBe(200);
    expect(res.json).toEqual({
      user: { id: user.id, email: user.email, name: "API Test", avatarUrl: null },
    });
  });

  it("accepts the same token as a bearer header", async () => {
    const res = await call(auth.GET, "/api/auth/me", { as: user, bearer: true });
    expect(res.status).toBe(200);
    expect((res.json as { user: { id: string } }).user.id).toBe(user.id);
  });

  it("treats a garbage token as signed out, not as an error", async () => {
    const forged = { ...user, token: "not.a.jwt" };
    const res = await call(auth.GET, "/api/auth/me", { as: forged });
    expect(res.status).toBe(200);
    expect(res.json).toEqual({ user: null });
  });

  it("treats a token for a deleted account as signed out", async () => {
    const gone = await createUser();
    await deleteUser(gone);
    const res = await call(auth.GET, "/api/auth/me", { as: gone });
    expect(res.status).toBe(200);
    expect(res.json).toEqual({ user: null });
  });
});
