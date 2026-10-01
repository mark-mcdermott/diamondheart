import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { deviceTokens } from "@/db/schema";
import type { PushReport } from "@/lib/server/push";
import * as push from "@/server/api/push";
import { call, createUser, deleteUser, type TestUser } from "./support";

const PATH = "/api/push/test";

describe("push test", () => {
  let user: TestUser;

  beforeAll(async () => {
    // No APNs key and no Firebase account: the suite must never reach a real push service.
    for (const name of ["APNS_KEY_ID", "APNS_TEAM_ID", "APNS_PRIVATE_KEY", "FCM_SERVICE_ACCOUNT"]) delete process.env[name];
    user = await createUser();
    await db.insert(deviceTokens).values([
      { id: crypto.randomUUID(), userId: user.id, platform: "ios", token: `ios-${crypto.randomUUID()}` },
      { id: crypto.randomUUID(), userId: user.id, platform: "android", token: `android-${crypto.randomUUID()}` },
    ]);
  });

  afterAll(async () => {
    await deleteUser(user);
  });

  it("answers 401 without a session", async () => {
    expect((await call(push.test.POST, PATH, { method: "POST" })).status).toBe(401);
  });

  it("skips a channel with no credentials and keeps its tokens", async () => {
    const res = await call(push.test.POST, PATH, { method: "POST", as: user });
    expect(res.status).toBe(200);
    expect(res.json as PushReport).toEqual({ sent: 0, failed: 0, removed: 0 });
    expect(await db.select().from(deviceTokens).where(eq(deviceTokens.userId, user.id))).toHaveLength(2);
  });

  it("refuses a burst from one account", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) statuses.push((await call(push.test.POST, PATH, { method: "POST", as: user })).status);
    expect(statuses.at(-1)).toBe(429);
  });
});
