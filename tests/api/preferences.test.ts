import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as preferences from "@/server/api/preferences";
import { call, createUser, deleteUser, type TestUser } from "./support";

type Body = { preferences: preferences.Preferences };
type Failure = { error: string; fields?: Record<string, string[]> };

const PATH = "/api/preferences";

describe("preferences", () => {
  let user: TestUser;
  let other: TestUser;

  beforeAll(async () => {
    user = await createUser();
    other = await createUser();
  });

  afterAll(async () => {
    await deleteUser(user);
    await deleteUser(other);
  });

  it("answers 401 without a session, before looking at the body", async () => {
    expect((await call(preferences.GET, PATH)).status).toBe(401);
    const bad = await call(preferences.PATCH, PATH, { method: "PATCH", body: { weightUnit: "stone" } });
    expect(bad.status).toBe(401);
  });

  it("returns defaults for a user who has never saved any", async () => {
    const res = await call(preferences.GET, PATH, { as: user });
    expect(res.status).toBe(200);
    const { preferences: prefs } = res.json as Body;
    expect(prefs.weightUnit).toBe("lb");
    expect(prefs.targets).toEqual({ calories: null, protein: null, carbs: null, fat: null });
    expect(prefs.dashboardSections).toEqual(["goals", "counters", "food", "recent"]);
    expect(prefs.useNetflixUI).toBe(true);
  });

  it("PATCH is partial: a saved key persists and the rest stay put", async () => {
    const first = await call(preferences.PATCH, PATH, { method: "PATCH", as: user, body: { weightUnit: "kg" } });
    expect(first.status).toBe(200);
    expect((first.json as Body).preferences.weightUnit).toBe("kg");

    const second = await call(preferences.PATCH, PATH, {
      method: "PATCH",
      as: user,
      body: { targets: { calories: 2000 } },
    });
    const prefs = (second.json as Body).preferences;
    expect(prefs.weightUnit).toBe("kg");
    expect(prefs.targets).toEqual({ calories: 2000, protein: null, carbs: null, fat: null });

    const read = await call(preferences.GET, PATH, { as: user });
    expect((read.json as Body).preferences).toEqual(prefs);
  });

  it("an explicit null clears a target", async () => {
    const res = await call(preferences.PATCH, PATH, {
      method: "PATCH",
      as: user,
      body: { targets: { calories: null } },
    });
    expect(res.status).toBe(200);
    expect((res.json as Body).preferences.targets.calories).toBeNull();
  });

  it("an empty patch reads back without writing a row", async () => {
    const fresh = await createUser();
    try {
      const res = await call(preferences.PATCH, PATH, { method: "PATCH", as: fresh, body: {} });
      expect(res.status).toBe(200);
      expect((res.json as Body).preferences.weightUnit).toBe("lb");
    } finally {
      await deleteUser(fresh);
    }
  });

  it("rejects a value outside the schema with a 422 naming the field", async () => {
    const res = await call(preferences.PATCH, PATH, { method: "PATCH", as: user, body: { weightUnit: "stone" } });
    expect(res.status).toBe(422);
    const body = res.json as Failure;
    expect(body.error).toBe("Validation failed");
    expect(Object.keys(body.fields ?? {})).toEqual(["weightUnit"]);
  });

  it("rejects a non-positive target and a repeated section", async () => {
    const target = await call(preferences.PATCH, PATH, {
      method: "PATCH",
      as: user,
      body: { targets: { protein: 0 } },
    });
    expect(target.status).toBe(422);
    expect(Object.keys((target.json as Failure).fields ?? {})).toEqual(["targets.protein"]);

    const sections = await call(preferences.PATCH, PATH, {
      method: "PATCH",
      as: user,
      body: { dashboardSections: ["goals", "goals"] },
    });
    expect(sections.status).toBe(422);
  });

  it("rejects an unknown key rather than ignoring it", async () => {
    const res = await call(preferences.PATCH, PATH, { method: "PATCH", as: user, body: { theme: "dark" } });
    expect(res.status).toBe(422);
  });

  it("rejects a body that is not JSON with a 400", async () => {
    const res = await call(preferences.PATCH, PATH, { method: "PATCH", as: user, rawBody: "weightUnit=kg" });
    expect(res.status).toBe(400);
  });

  it("one user's writes never reach another's row", async () => {
    await call(preferences.PATCH, PATH, { method: "PATCH", as: other, body: { weightUnit: "kg", targets: { fat: 70 } } });
    const mine = await call(preferences.GET, PATH, { as: user });
    expect((mine.json as Body).preferences.targets.fat).toBeNull();
    const theirs = await call(preferences.GET, PATH, { as: other });
    expect((theirs.json as Body).preferences.targets.fat).toBe(70);
  });
});
