import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { trackerEntries, trackerMetrics } from "@/db/schema";
import * as integrations from "@/server/api/integrations";
import type { IntegrationConnection } from "@/server/api/integrations";
import { call, createUser, deleteUser, type TestUser } from "./support";

type List = { connections: IntegrationConnection[]; ouraConfigured: boolean };
type Failure = { error: string; fields?: Record<string, string[]> };

const SYNC = "/api/integrations/healthkit/sync";

/** Health's readings for an account, as `slug → day → values`, so a duplicate shows up as two values. */
async function readings(user: TestUser): Promise<Record<string, Record<string, string[]>>> {
  const rows = await db
    .select({ slug: trackerMetrics.slug, value: trackerEntries.value, date: trackerEntries.date })
    .from(trackerEntries)
    .innerJoin(trackerMetrics, eq(trackerEntries.metricId, trackerMetrics.id))
    .where(and(eq(trackerEntries.userId, user.id), eq(trackerEntries.notes, "source:healthkit")));
  const bySlug: Record<string, Record<string, string[]>> = {};
  for (const row of rows) ((bySlug[row.slug] ??= {})[row.date.toISOString().slice(0, 10)] ??= []).push(row.value);
  return bySlug;
}

const sync = (user: TestUser, days: unknown) => call(integrations.healthkit.sync, SYNC, { method: "POST", as: user, body: { days } });
const connect = (user: TestUser) => call(integrations.healthkit.connect, "/api/integrations/healthkit/connect", { method: "POST", as: user });

describe("healthkit", () => {
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
    expect((await call(integrations.healthkit.connect, "/api/integrations/healthkit/connect", { method: "POST" })).status).toBe(401);
    expect((await call(integrations.healthkit.sync, SYNC, { method: "POST", body: { days: [{ date: "2026-09-30" }] } })).status).toBe(401);
  });

  it("refuses a sync before Apple Health is connected", async () => {
    expect((await sync(user, [{ date: "2026-09-30", steps: 1 }])).status).toBe(404);
  });

  it("connects once, however often it is asked", async () => {
    const first = (await connect(user)).json as { connection: IntegrationConnection };
    const second = (await connect(user)).json as { connection: IntegrationConnection };
    expect(first.connection).toMatchObject({ service: "healthkit", status: "active", lastSyncAt: null });
    expect(second.connection.id).toBe(first.connection.id);
    const list = (await call(integrations.GET, "/api/integrations", { as: user })).json as List;
    expect(list.connections).toHaveLength(1);
  });

  it("stores each reading on its day and stamps the sync", async () => {
    const res = await sync(user, [
      { date: "2026-09-29", steps: 8123, sleepDuration: 7.4, restingHeartRate: 58 },
      { date: "2026-09-30", steps: 2040, activeCalories: 310.5, hrv: 44, spo2: 97 },
    ]);
    expect(res.status).toBe(200);
    expect(res.json).toEqual({ entries: 7 });
    expect(await readings(user)).toEqual({
      "bio-steps": { "2026-09-29": ["8123"], "2026-09-30": ["2040"] },
      "bio-sleep-duration": { "2026-09-29": ["7.4"] },
      "bio-resting-hr": { "2026-09-29": ["58"] },
      "bio-active-calories": { "2026-09-30": ["310.5"] },
      "bio-hrv": { "2026-09-30": ["44"] },
      "bio-spo2": { "2026-09-30": ["97"] },
    });
    const [connection] = ((await call(integrations.GET, "/api/integrations", { as: user })).json as List).connections;
    expect(connection.lastSyncAt).not.toBeNull();
  });

  it("replaces a day's reading on the next sync and leaves what was not resent", async () => {
    expect((await sync(user, [{ date: "2026-09-30", steps: 9001 }])).json).toEqual({ entries: 1 });
    const stored = await readings(user);
    expect(stored["bio-steps"]).toEqual({ "2026-09-29": ["8123"], "2026-09-30": ["9001"] });
    expect(stored["bio-hrv"]).toEqual({ "2026-09-30": ["44"] });
  });

  it("keeps one account's readings out of another's", async () => {
    await connect(other);
    await sync(other, [{ date: "2026-09-30", steps: 5 }]);
    expect((await readings(other))["bio-steps"]).toEqual({ "2026-09-30": ["5"] });
    expect((await readings(user))["bio-steps"]["2026-09-30"]).toEqual(["9001"]);
  });

  it("answers 422 for a malformed day, an unknown reading or a repeated day", async () => {
    for (const days of [[], [{ date: "30/09/2026", steps: 1 }], [{ date: "2026-09-30", steps: -1 }], [{ date: "2026-09-30", mood: 3 }], [{ date: "2026-09-30" }, { date: "2026-09-30" }]]) {
      const res = await sync(user, days);
      expect(res.status).toBe(422);
      expect((res.json as Failure).error).toBe("Validation failed");
    }
  });

  it("disconnects, after which a sync is refused", async () => {
    const path = "/api/integrations/healthkit/disconnect";
    expect((await call(integrations.healthkit.disconnect, path, { method: "POST", as: user })).status).toBe(204);
    expect((await sync(user, [{ date: "2026-09-30", steps: 1 }])).status).toBe(404);
    const [connection] = ((await call(integrations.GET, "/api/integrations", { as: user })).json as List).connections;
    expect(connection.status).toBe("disconnected");
  });
});
