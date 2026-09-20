import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userPreferences, users, type MeditationPreset, type MeditationSession, type MeditationStyle } from "@/db/schema";
import * as meditation from "@/server/api/meditation";
import { call, createUser, deleteUser, type TestUser } from "./support";

type Failure = { error: string; fields?: Record<string, string[]> };
const PATH = "/api/meditation";

describe("meditation", () => {
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

  it("answers 401 without a session", async () => {
    expect((await call(meditation.GET, PATH)).status).toBe(401);
    expect((await call(meditation.presence.PUT, `${PATH}/presence`, { method: "PUT" })).status).toBe(401);
  });

  it("the overview starts empty with the default timer, and defaults seed once", async () => {
    const empty = (await call(meditation.GET, PATH, { as: user })).json as meditation.MeditationOverview;
    expect(empty).toEqual({ sessions: [], styles: [], presets: [], defaultTimerSeconds: 600 });

    const seeded = (await call(meditation.defaults.POST, `${PATH}/defaults`, { method: "POST", as: user })).json as { styles: MeditationStyle[]; presets: MeditationPreset[] };
    expect(seeded.styles.map((s) => s.label)).toEqual(["Guided", "Breathing"]);
    expect(seeded.presets.map((p) => p.seconds)).toEqual([300, 600, 900, 1200, 1800]);

    const again = (await call(meditation.defaults.POST, `${PATH}/defaults`, { method: "POST", as: user })).json as { styles: MeditationStyle[] };
    expect(again.styles).toHaveLength(2);
  });

  it("logs, edits and deletes a session, only for its owner", async () => {
    const created = await call(meditation.sessions.POST, `${PATH}/sessions`, { method: "POST", as: user, body: { duration: 600, notes: "calm" } });
    expect(created.status).toBe(201);
    const session = (created.json as { session: MeditationSession }).session;
    expect(session).toMatchObject({ duration: 600, type: "guided", notes: "calm" });

    const bad = await call(meditation.sessions.POST, `${PATH}/sessions`, { method: "POST", as: user, body: { duration: 0 } });
    expect(bad.status).toBe(422);
    expect(Object.keys((bad.json as Failure).fields ?? {})).toEqual(["duration"]);

    const patched = await call(meditation.session.PATCH, `${PATH}/sessions/x`, { method: "PATCH", as: user, params: { id: session.id }, body: { type: "breathing" } });
    expect((patched.json as { session: MeditationSession }).session).toMatchObject({ duration: 600, type: "breathing" });

    expect((await call(meditation.session.PATCH, `${PATH}/sessions/x`, { method: "PATCH", as: other, params: { id: session.id }, body: { duration: 1 } })).status).toBe(404);
    expect((await call(meditation.session.DELETE, `${PATH}/sessions/x`, { method: "DELETE", as: other, params: { id: session.id } })).status).toBe(404);
    expect((await call(meditation.session.DELETE, `${PATH}/sessions/x`, { method: "DELETE", as: user, params: { id: session.id } })).status).toBe(204);
  });

  it("sums minutes and sessions per day", async () => {
    // Days are grouped by the database's DATE(), which reads the UTC day — the same
    // rule the food and dashboard totals follow — so the fixtures sit mid-day UTC.
    await meditation.createSession(user.id, { duration: 600, date: new Date("2026-09-20T10:00:00Z") });
    await meditation.createSession(user.id, { duration: 300, date: new Date("2026-09-20T14:00:00Z") });
    await meditation.createSession(user.id, { duration: 1200, date: new Date("2026-09-21T10:00:00Z") });
    const res = await call(meditation.totals.GET, `${PATH}/totals?from=2026-09-20&to=2026-09-21`, { as: user });
    expect(res.status).toBe(200);
    expect((res.json as { days: unknown[] }).days).toEqual([
      { date: "2026-09-20", minutes: 15, sessions: 2 },
      { date: "2026-09-21", minutes: 20, sessions: 1 },
    ]);
  });

  it("styles and presets are per user and validated", async () => {
    const style = (await call(meditation.styles.POST, `${PATH}/styles`, { method: "POST", as: user, body: { label: "Walking" } })).json as { style: MeditationStyle };
    expect(style.style).toMatchObject({ label: "Walking", iconName: "brain", sortOrder: 2 });
    expect((await call(meditation.style.PATCH, `${PATH}/styles/x`, { method: "PATCH", as: other, params: { id: style.style.id }, body: { label: "Mine" } })).status).toBe(404);

    const preset = await call(meditation.presets.POST, `${PATH}/presets`, { method: "POST", as: user, body: { label: "Quick", seconds: 0 } });
    expect(preset.status).toBe(422);
    const ok = (await call(meditation.presets.POST, `${PATH}/presets`, { method: "POST", as: user, body: { label: "Quick", seconds: 120 } })).json as { preset: MeditationPreset };
    expect(ok.preset.sortOrder).toBe(5);
    expect((await call(meditation.preset.DELETE, `${PATH}/presets/x`, { method: "DELETE", as: user, params: { id: ok.preset.id } })).status).toBe(204);
  });

  it("sets the default timer", async () => {
    const res = await call(meditation.timer.PATCH, `${PATH}/timer`, { method: "PATCH", as: user, body: { seconds: 900 } });
    expect(res.json).toEqual({ defaultTimerSeconds: 900 });
    const [row] = await db.select({ seconds: users.defaultTimerSeconds }).from(users).where(eq(users.id, user.id));
    expect(row.seconds).toBe(900);
  });

  it("presence excludes the caller, counts others, and redacts a name on request", async () => {
    await call(meditation.presence.PUT, `${PATH}/presence`, { method: "PUT", as: user });
    const alone = (await call(meditation.presence.GET, `${PATH}/presence`, { as: user })).json as meditation.MeditatingNow;
    expect(alone.count).toBe(0);

    await call(meditation.presence.PUT, `${PATH}/presence`, { method: "PUT", as: other });
    const withOther = (await call(meditation.presence.GET, `${PATH}/presence`, { as: user })).json as meditation.MeditatingNow;
    expect(withOther.count).toBe(1);
    expect(withOther.meditators[0].name).toBe("API Test");

    await db.insert(userPreferences).values({ id: crypto.randomUUID(), userId: other.id, showNameWhenMeditating: false });
    const redacted = (await call(meditation.presence.GET, `${PATH}/presence`, { as: user })).json as meditation.MeditatingNow;
    expect(redacted.meditators[0].name).not.toBe("API Test");

    expect((await call(meditation.presence.DELETE, `${PATH}/presence`, { method: "DELETE", as: other })).status).toBe(204);
    expect(((await call(meditation.presence.GET, `${PATH}/presence`, { as: user })).json as meditation.MeditatingNow).count).toBe(0);
  });
});
