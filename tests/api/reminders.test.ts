import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ReminderSchedule } from "@/db/schema";
import * as metrics from "@/server/api/metrics";
import * as reminders from "@/server/api/reminders";
import { call, createUser, deleteUser, type TestUser } from "./support";

type One = { reminder: ReminderSchedule };
type Many = { reminders: ReminderSchedule[] };
type Failure = { error: string; fields?: Record<string, string[]> };

const PATH = "/api/reminders";

describe("reminders", () => {
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
    expect((await call(reminders.GET, PATH)).status).toBe(401);
  });

  it("creates with defaults, sorted days, and lists by time", async () => {
    const late = await call(reminders.POST, PATH, { method: "POST", as: user, body: { label: "Evening", time: "21:30", days: [5, 1, 3] } });
    expect(late.status).toBe(201);
    expect((late.json as One).reminder).toMatchObject({ label: "Evening", time: "21:30", days: [1, 3, 5], timezone: "America/Chicago", enabled: true, metricId: null });

    await call(reminders.POST, PATH, { method: "POST", as: user, body: { label: "Morning", time: "07:00", days: [1] } });
    const list = (await call(reminders.GET, PATH, { as: user })).json as Many;
    expect(list.reminders.map((r) => r.label)).toEqual(["Morning", "Evening"]);
  });

  it("validates time, days, and unknown keys", async () => {
    const time = await call(reminders.POST, PATH, { method: "POST", as: user, body: { label: "x", time: "25:00", days: [1] } });
    expect(time.status).toBe(422);
    expect(Object.keys((time.json as Failure).fields ?? {})).toEqual(["time"]);

    const days = await call(reminders.POST, PATH, { method: "POST", as: user, body: { label: "x", time: "09:00", days: [1, 1] } });
    expect(days.status).toBe(422);

    const smuggled = await call(reminders.POST, PATH, { method: "POST", as: user, body: { label: "x", time: "09:00", days: [1], userId: other.id } });
    expect(smuggled.status).toBe(422);
  });

  it("only points at the caller's own metric", async () => {
    const theirs = await metrics.createMetric(other.id, { name: "Theirs", valueType: "number" });
    const res = await call(reminders.POST, PATH, { method: "POST", as: user, body: { label: "Log it", time: "09:00", days: [1], metricId: theirs.id } });
    expect(res.status).toBe(404);

    const mine = await metrics.createMetric(user.id, { name: "Mine", valueType: "number" });
    const ok = await call(reminders.POST, PATH, { method: "POST", as: user, body: { label: "Log it", time: "09:00", days: [1], metricId: mine.id } });
    expect(ok.status).toBe(201);
    expect((ok.json as One).reminder.metricId).toBe(mine.id);
  });

  it("PATCH is partial and cannot reassign ownership", async () => {
    const { reminder } = (await call(reminders.POST, PATH, { method: "POST", as: user, body: { label: "Toggle me", time: "12:00", days: [2] } })).json as One;

    const off = await call(reminders.item.PATCH, `${PATH}/x`, { method: "PATCH", as: user, params: { id: reminder.id }, body: { enabled: false } });
    expect(off.status).toBe(200);
    expect((off.json as One).reminder).toMatchObject({ enabled: false, label: "Toggle me", time: "12:00" });

    const foreign = await call(reminders.item.PATCH, `${PATH}/x`, { method: "PATCH", as: other, params: { id: reminder.id }, body: { enabled: true } });
    expect(foreign.status).toBe(404);

    const smuggled = await call(reminders.item.PATCH, `${PATH}/x`, { method: "PATCH", as: user, params: { id: reminder.id }, body: { userId: other.id } });
    expect(smuggled.status).toBe(422);
  });

  it("deletes only the owner's reminder", async () => {
    const { reminder } = (await call(reminders.POST, PATH, { method: "POST", as: user, body: { label: "Gone", time: "08:00", days: [0] } })).json as One;
    expect((await call(reminders.item.DELETE, `${PATH}/x`, { method: "DELETE", as: other, params: { id: reminder.id } })).status).toBe(404);
    expect((await call(reminders.item.DELETE, `${PATH}/x`, { method: "DELETE", as: user, params: { id: reminder.id } })).status).toBe(204);
    expect((await call(reminders.item.DELETE, `${PATH}/x`, { method: "DELETE", as: user, params: { id: reminder.id } })).status).toBe(404);
  });
});
