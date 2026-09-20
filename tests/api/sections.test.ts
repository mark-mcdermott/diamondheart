import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as appointments from "@/server/api/appointments";
import * as medical from "@/server/api/medical";
import * as tracking from "@/server/api/tracking";
import { call, createUser, deleteUser, type TestUser } from "./support";

type Failure = { error: string; fields?: Record<string, string[]> };

describe("tracking, medical and appointments", () => {
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

  it("answer 401 without a session", async () => {
    expect((await call(tracking.GET, "/api/tracking")).status).toBe(401);
    expect((await call(medical.GET, "/api/medical")).status).toBe(401);
    expect((await call(appointments.GET, "/api/appointments")).status).toBe(401);
  });

  it("tracking items are created, counted, edited and deleted by their owner", async () => {
    const created = await call(tracking.POST, "/api/tracking", { method: "POST", as: user, body: { name: "Books read", category: "Hobbies", unit: "books" } });
    expect(created.status).toBe(201);
    const item = (created.json as { item: tracking.TrackingItem }).item;
    expect(item).toMatchObject({ name: "Books read", category: "Hobbies", count: 0, unit: "books" });

    const bumped = await call(tracking.count.POST, "/api/tracking/x/count", { method: "POST", as: user, params: { id: item.id }, body: { delta: 2 } });
    expect((bumped.json as { item: tracking.TrackingItem }).item.count).toBe(2);
    expect((await call(tracking.count.POST, "/api/tracking/x/count", { method: "POST", as: user, params: { id: item.id }, body: { delta: 0 } })).status).toBe(422);
    expect((await call(tracking.count.POST, "/api/tracking/x/count", { method: "POST", as: other, params: { id: item.id }, body: { delta: 1 } })).status).toBe(404);

    const edited = await call(tracking.item.PATCH, "/api/tracking/x", { method: "PATCH", as: user, params: { id: item.id }, body: { notes: "this year", category: "" } });
    expect((edited.json as { item: tracking.TrackingItem }).item).toMatchObject({ notes: "this year", category: null, count: 2 });

    const list = (await call(tracking.GET, "/api/tracking", { as: user })).json as { items: tracking.TrackingItem[] };
    expect(list.items.map((i) => i.id)).toEqual([item.id]);
    expect(((await call(tracking.GET, "/api/tracking", { as: other })).json as { items: unknown[] }).items).toEqual([]);

    expect((await call(tracking.item.DELETE, "/api/tracking/x", { method: "DELETE", as: other, params: { id: item.id } })).status).toBe(404);
    expect((await call(tracking.item.DELETE, "/api/tracking/x", { method: "DELETE", as: user, params: { id: item.id } })).status).toBe(204);
  });

  it("medical logs validate severity, list newest first, and total by type and day", async () => {
    const bad = await call(medical.POST, "/api/medical", { method: "POST", as: user, body: { type: "symptom", severity: 9 } });
    expect(bad.status).toBe(422);
    expect(Object.keys((bad.json as Failure).fields ?? {})).toEqual(["severity"]);

    await medical.createLog(user.id, { type: "symptom", subtype: "headache", severity: 3, date: new Date("2026-09-20T10:00:00Z") });
    await medical.createLog(user.id, { type: "symptom", severity: 5, date: new Date("2026-09-20T15:00:00Z") });
    const med = (await call(medical.POST, "/api/medical", { method: "POST", as: user, body: { type: "medication", subtype: "ibuprofen", date: "2026-09-21T10:00:00Z" } })).json as { log: medical.MedicalLog };
    expect(med.log).toMatchObject({ type: "medication", severity: null });

    const list = (await call(medical.GET, "/api/medical", { as: user })).json as { logs: medical.MedicalLog[] };
    expect(list.logs.map((l) => l.type)).toEqual(["medication", "symptom", "symptom"]);

    const totals = (await call(medical.totals.GET, "/api/medical/totals?from=2026-09-20&to=2026-09-21", { as: user })).json as medical.MedicalTotals;
    expect(totals.byType).toEqual([{ type: "symptom", count: 2 }, { type: "medication", count: 1 }]);
    expect(totals.bySeverity).toEqual([{ date: "2026-09-20", avgSeverity: 4, count: 2 }]);

    expect((await call(medical.log.DELETE, "/api/medical/x", { method: "DELETE", as: other, params: { id: med.log.id } })).status).toBe(404);
    expect((await call(medical.log.DELETE, "/api/medical/x", { method: "DELETE", as: user, params: { id: med.log.id } })).status).toBe(204);
  });

  it("appointments require a title and a date, patch partially, and stay with their owner", async () => {
    const missing = await call(appointments.POST, "/api/appointments", { method: "POST", as: user, body: { title: "Dentist" } });
    expect(missing.status).toBe(422);
    expect(Object.keys((missing.json as Failure).fields ?? {})).toEqual(["date"]);

    const created = await call(appointments.POST, "/api/appointments", {
      method: "POST",
      as: user,
      body: { title: "Dentist", date: "2026-10-01T14:00:00Z", provider: "Dr. Lee", durationMinutes: 30 },
    });
    expect(created.status).toBe(201);
    const appt = (created.json as { appointment: appointments.Appointment }).appointment;
    expect(appt).toMatchObject({ title: "Dentist", appointmentType: "doctor", status: "upcoming", provider: "Dr. Lee", durationMinutes: 30 });

    const done = await call(appointments.item.PATCH, "/api/appointments/x", { method: "PATCH", as: user, params: { id: appt.id }, body: { status: "completed", followUp: "6 months" } });
    expect((done.json as { appointment: appointments.Appointment }).appointment).toMatchObject({ status: "completed", followUp: "6 months", provider: "Dr. Lee" });

    expect((await call(appointments.item.PATCH, "/api/appointments/x", { method: "PATCH", as: other, params: { id: appt.id }, body: { title: "Mine" } })).status).toBe(404);
    expect((await call(appointments.item.DELETE, "/api/appointments/x", { method: "DELETE", as: user, params: { id: appt.id } })).status).toBe(204);
  });
});
