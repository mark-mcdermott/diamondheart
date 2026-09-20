import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { notifications as table, type Notification } from "@/db/schema";
import * as notifications from "@/server/api/notifications";
import { call, createUser, deleteUser, type TestUser } from "./support";

type List = { notifications: Notification[]; unread: number };

describe("notifications", () => {
  let user: TestUser;
  let other: TestUser;

  beforeAll(async () => {
    user = await createUser();
    other = await createUser();
    await db.insert(table).values([
      { id: crypto.randomUUID(), userId: user.id, type: "reminder", title: "Log your weight" },
      { id: crypto.randomUUID(), userId: user.id, type: "new_episode", title: "New episode", read: true },
      { id: crypto.randomUUID(), userId: other.id, type: "reminder", title: "Theirs" },
    ]);
  });

  afterAll(async () => {
    await deleteUser(user);
    await deleteUser(other);
  });

  it("answers 401 without a session", async () => {
    expect((await call(notifications.GET, "/api/notifications")).status).toBe(401);
  });

  it("lists only the caller's, newest first, with the unread count", async () => {
    const res = await call(notifications.GET, "/api/notifications", { as: user });
    expect(res.status).toBe(200);
    const body = res.json as List;
    expect(body.notifications.map((n) => n.title).sort()).toEqual(["Log your weight", "New episode"]);
    expect(body.unread).toBe(1);
  });

  it("marks one read, refuses someone else's, and marks all read", async () => {
    const mine = ((await call(notifications.GET, "/api/notifications", { as: user })).json as List).notifications;
    const unread = mine.find((n) => !n.read)!;

    const foreign = await call(notifications.item.PATCH, "/api/notifications/x", { method: "PATCH", as: other, params: { id: unread.id }, body: { read: true } });
    expect(foreign.status).toBe(404);

    const one = await call(notifications.item.PATCH, "/api/notifications/x", { method: "PATCH", as: user, params: { id: unread.id }, body: { read: true } });
    expect(one.status).toBe(200);
    expect((one.json as { notification: Notification }).notification.read).toBe(true);

    await call(notifications.item.PATCH, "/api/notifications/x", { method: "PATCH", as: user, params: { id: unread.id }, body: { read: false } });
    const all = await call(notifications.PATCH, "/api/notifications", { method: "PATCH", as: user, body: { read: true } });
    expect(all.status).toBe(200);
    expect((all.json as { unread: number }).unread).toBe(0);

    const theirs = (await call(notifications.GET, "/api/notifications", { as: other })).json as List;
    expect(theirs.unread).toBe(1);
  });

  it("deletes only the caller's", async () => {
    const theirs = ((await call(notifications.GET, "/api/notifications", { as: other })).json as List).notifications[0];
    expect((await call(notifications.item.DELETE, "/api/notifications/x", { method: "DELETE", as: user, params: { id: theirs.id } })).status).toBe(404);
    expect((await call(notifications.item.DELETE, "/api/notifications/x", { method: "DELETE", as: other, params: { id: theirs.id } })).status).toBe(204);
    expect(((await call(notifications.GET, "/api/notifications", { as: other })).json as List).notifications).toEqual([]);
  });
});
