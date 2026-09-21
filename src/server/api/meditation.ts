import { and, asc, desc, eq, gt, gte, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  meditationPresence,
  meditationPresets,
  meditationSessions,
  meditationStyles,
  userPreferences,
  users,
  type MeditationPreset,
  type MeditationSession,
  type MeditationStyle,
} from "@/db/schema";
import { PRESENCE_ACTIVE_CUTOFF_MS, redactMeditator, type PresenceMeditator } from "@/lib/presence";
import type { ApiHandler } from "./_lib/context";
import { requireSession } from "./_lib/guard";
import { HttpError, fail, handler, json, noContent, notFound, readJson } from "./_lib/http";
import {
  calendarDay,
  createMeditationSessionSchema,
  meditationPresetSchema,
  meditationStyleSchema,
  meditationTimerSchema,
  updateMeditationSessionSchema,
  type CreateMeditationSession,
  type MeditationPresetInput,
  type MeditationStyleInput,
  type UpdateMeditationSession,
} from "./_lib/schemas";
import { dayBounds, parseDate } from "@/lib/dates";

const DEFAULT_TIMER_SECONDS = 600;

export interface MeditationOverview {
  /** Newest first, at most a thousand. */
  sessions: MeditationSession[];
  styles: MeditationStyle[];
  presets: MeditationPreset[];
  defaultTimerSeconds: number;
}

export function listSessions(userId: string): Promise<MeditationSession[]> {
  return db.select().from(meditationSessions).where(eq(meditationSessions.userId, userId)).orderBy(desc(meditationSessions.date)).limit(1000);
}

export function listStyles(userId: string): Promise<MeditationStyle[]> {
  return db.select().from(meditationStyles).where(eq(meditationStyles.userId, userId)).orderBy(asc(meditationStyles.sortOrder));
}

export function listPresets(userId: string): Promise<MeditationPreset[]> {
  return db.select().from(meditationPresets).where(eq(meditationPresets.userId, userId)).orderBy(asc(meditationPresets.sortOrder));
}

export async function defaultTimerSeconds(userId: string): Promise<number> {
  const [user] = await db.select({ seconds: users.defaultTimerSeconds }).from(users).where(eq(users.id, userId)).limit(1);
  return user?.seconds ?? DEFAULT_TIMER_SECONDS;
}

export async function readOverview(userId: string): Promise<MeditationOverview> {
  const [sessions, styles, presets, timer] = await Promise.all([listSessions(userId), listStyles(userId), listPresets(userId), defaultTimerSeconds(userId)]);
  return { sessions, styles, presets, defaultTimerSeconds: timer };
}

/** Seeds the starter styles and presets for whichever list is empty. Safe to call again. */
export async function ensureDefaults(userId: string): Promise<{ styles: MeditationStyle[]; presets: MeditationPreset[] }> {
  const [styles, presets] = await Promise.all([listStyles(userId), listPresets(userId)]);
  if (styles.length === 0) {
    await db.insert(meditationStyles).values([
      { id: crypto.randomUUID(), userId, label: "Guided", iconName: "brain", sortOrder: 0 },
      { id: crypto.randomUUID(), userId, label: "Breathing", iconName: "wind", sortOrder: 1 },
    ]);
  }
  if (presets.length === 0) {
    await db.insert(meditationPresets).values(
      [
        ["5 min", 300],
        ["10 min", 600],
        ["15 min", 900],
        ["20 min", 1200],
        ["30 min", 1800],
      ].map(([label, seconds], i) => ({ id: crypto.randomUUID(), userId, label: String(label), seconds: Number(seconds), sortOrder: i }))
    );
  }
  return { styles: styles.length ? styles : await listStyles(userId), presets: presets.length ? presets : await listPresets(userId) };
}

// --- sessions -----------------------------------------------------------------

export async function createSession(userId: string, input: CreateMeditationSession): Promise<MeditationSession> {
  const [row] = await db
    .insert(meditationSessions)
    .values({
      id: crypto.randomUUID(),
      userId,
      duration: input.duration,
      type: input.type ?? "guided",
      notes: input.notes ?? null,
      date: input.date ?? new Date(),
    })
    .returning();
  return row;
}

export async function updateSession(userId: string, id: string, patch: UpdateMeditationSession): Promise<MeditationSession> {
  const columns: Partial<typeof meditationSessions.$inferInsert> = {};
  if (patch.duration !== undefined) columns.duration = patch.duration;
  if (patch.type !== undefined) columns.type = patch.type;
  if (patch.notes !== undefined) columns.notes = patch.notes;

  const [row] =
    Object.keys(columns).length === 0
      ? await db.select().from(meditationSessions).where(and(eq(meditationSessions.id, id), eq(meditationSessions.userId, userId))).limit(1)
      : await db.update(meditationSessions).set(columns).where(and(eq(meditationSessions.id, id), eq(meditationSessions.userId, userId))).returning();
  if (!row) throw new HttpError(notFound("Session not found"));
  return row;
}

export async function deleteSession(userId: string, id: string): Promise<void> {
  const deleted = await db
    .delete(meditationSessions)
    .where(and(eq(meditationSessions.id, id), eq(meditationSessions.userId, userId)))
    .returning({ id: meditationSessions.id });
  if (deleted.length === 0) throw new HttpError(notFound("Session not found"));
}

/** Minutes and sessions per day across a range, for the chart. */
export async function dailyTotals(userId: string, from: Date, to: Date): Promise<{ date: string; minutes: number; sessions: number }[]> {
  const rows = await db
    .select({
      date: sql<string>`DATE(${meditationSessions.date})`,
      totalMinutes: sql<number>`COALESCE(SUM(${meditationSessions.duration}), 0) / 60`,
      count: sql<number>`COUNT(*)`,
    })
    .from(meditationSessions)
    .where(and(eq(meditationSessions.userId, userId), gte(meditationSessions.date, from), lt(meditationSessions.date, to)))
    .groupBy(sql`DATE(${meditationSessions.date})`)
    .orderBy(sql`DATE(${meditationSessions.date})`);
  return rows.map((r) => ({ date: String(r.date), minutes: Number(r.totalMinutes), sessions: Number(r.count) }));
}

// --- styles and presets ---------------------------------------------------------

export async function createStyle(userId: string, input: MeditationStyleInput): Promise<MeditationStyle> {
  const existing = await listStyles(userId);
  const [row] = await db
    .insert(meditationStyles)
    .values({ id: crypto.randomUUID(), userId, label: input.label, iconName: input.iconName ?? "brain", sortOrder: existing.length })
    .returning();
  return row;
}

export async function updateStyle(userId: string, id: string, input: MeditationStyleInput): Promise<MeditationStyle> {
  const [row] = await db
    .update(meditationStyles)
    .set({ label: input.label, iconName: input.iconName ?? "brain" })
    .where(and(eq(meditationStyles.id, id), eq(meditationStyles.userId, userId)))
    .returning();
  if (!row) throw new HttpError(notFound("Style not found"));
  return row;
}

export async function deleteStyle(userId: string, id: string): Promise<void> {
  const deleted = await db.delete(meditationStyles).where(and(eq(meditationStyles.id, id), eq(meditationStyles.userId, userId))).returning({ id: meditationStyles.id });
  if (deleted.length === 0) throw new HttpError(notFound("Style not found"));
}

export async function createPreset(userId: string, input: MeditationPresetInput): Promise<MeditationPreset> {
  const existing = await listPresets(userId);
  const [row] = await db
    .insert(meditationPresets)
    .values({ id: crypto.randomUUID(), userId, label: input.label, seconds: input.seconds, sortOrder: existing.length })
    .returning();
  return row;
}

export async function updatePreset(userId: string, id: string, input: MeditationPresetInput): Promise<MeditationPreset> {
  const [row] = await db
    .update(meditationPresets)
    .set({ label: input.label, seconds: input.seconds })
    .where(and(eq(meditationPresets.id, id), eq(meditationPresets.userId, userId)))
    .returning();
  if (!row) throw new HttpError(notFound("Preset not found"));
  return row;
}

export async function deletePreset(userId: string, id: string): Promise<void> {
  const deleted = await db.delete(meditationPresets).where(and(eq(meditationPresets.id, id), eq(meditationPresets.userId, userId))).returning({ id: meditationPresets.id });
  if (deleted.length === 0) throw new HttpError(notFound("Preset not found"));
}

export async function setDefaultTimer(userId: string, seconds: number): Promise<number> {
  await db.update(users).set({ defaultTimerSeconds: seconds, updatedAt: new Date() }).where(eq(users.id, userId));
  return seconds;
}

// --- presence -------------------------------------------------------------------

export interface MeditatingNow {
  count: number;
  meditators: PresenceMeditator[];
}

const PREVIEW_LIMIT = 8;

/** Records that the caller is meditating right now; called on a heartbeat while the timer runs. */
export async function ping(userId: string): Promise<void> {
  const now = new Date();
  await db
    .insert(meditationPresence)
    .values({ userId, startedAt: now, lastPingAt: now })
    .onConflictDoUpdate({ target: meditationPresence.userId, set: { lastPingAt: now } });
}

export async function stop(userId: string): Promise<void> {
  await db.delete(meditationPresence).where(eq(meditationPresence.userId, userId));
}

/** Everyone else meditating now, names redacted where they asked for that. */
export async function meditatingNow(userId: string): Promise<MeditatingNow> {
  const cutoff = new Date(Date.now() - PRESENCE_ACTIVE_CUTOFF_MS);
  const where = and(ne(meditationPresence.userId, userId), gt(meditationPresence.lastPingAt, cutoff));

  const rows = await db
    .select({
      userId: meditationPresence.userId,
      userName: users.name,
      userAvatarUrl: users.avatarUrl,
      showName: sql<boolean | null>`${userPreferences.showNameWhenMeditating}`.as("show_name"),
    })
    .from(meditationPresence)
    .innerJoin(users, eq(users.id, meditationPresence.userId))
    .leftJoin(userPreferences, eq(userPreferences.userId, meditationPresence.userId))
    .where(where)
    .orderBy(meditationPresence.startedAt)
    .limit(PREVIEW_LIMIT);

  const meditators = rows.map((r) =>
    redactMeditator({ userId: r.userId, name: r.userName, avatarUrl: r.userAvatarUrl, isAnonymous: false }, r.showName ?? true)
  );
  const [countRow] = await db.select({ count: sql<number>`count(*)::int` }).from(meditationPresence).where(where);
  return { count: Number(countRow?.count ?? 0), meditators };
}

// --- handlers -------------------------------------------------------------------

function dayParam(request: Request, name: string): Date {
  const raw = new URL(request.url).searchParams.get(name);
  const parsed = calendarDay.safeParse(raw ?? "");
  if (!parsed.success) throw new HttpError(fail(422, "Validation failed", { [name]: ["Must be YYYY-MM-DD"] }));
  return parseDate(parsed.data);
}

export const GET: ApiHandler = ({ request }) =>
  handler(async () => {
    const { userId } = await requireSession(request);
    return json(await readOverview(userId));
  });

export const defaults = {
  POST: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      return json(await ensureDefaults(userId));
    })) satisfies ApiHandler,
};

export const sessions = {
  GET: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      return json({ sessions: await listSessions(userId) });
    })) satisfies ApiHandler,
  POST: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      const input = await readJson(request, createMeditationSessionSchema);
      return json({ session: await createSession(userId, input) }, 201);
    })) satisfies ApiHandler,
};

export const session = {
  PATCH: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      const patch = await readJson(request, updateMeditationSessionSchema);
      return json({ session: await updateSession(userId, params.id, patch) });
    })) satisfies ApiHandler,
  DELETE: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      await deleteSession(userId, params.id);
      return noContent();
    })) satisfies ApiHandler,
};

export const totals = {
  GET: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      const from = dayParam(request, "from");
      const to = dayParam(request, "to");
      if (to < from) throw new HttpError(fail(422, "Validation failed", { to: ["Must not be before from"] }));
      return json({ days: await dailyTotals(userId, from, dayBounds(to).end) });
    })) satisfies ApiHandler,
};

export const styles = {
  GET: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      return json({ styles: await listStyles(userId) });
    })) satisfies ApiHandler,
  POST: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      return json({ style: await createStyle(userId, await readJson(request, meditationStyleSchema)) }, 201);
    })) satisfies ApiHandler,
};

export const style = {
  PATCH: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      return json({ style: await updateStyle(userId, params.id, await readJson(request, meditationStyleSchema)) });
    })) satisfies ApiHandler,
  DELETE: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      await deleteStyle(userId, params.id);
      return noContent();
    })) satisfies ApiHandler,
};

export const presets = {
  GET: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      return json({ presets: await listPresets(userId) });
    })) satisfies ApiHandler,
  POST: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      return json({ preset: await createPreset(userId, await readJson(request, meditationPresetSchema)) }, 201);
    })) satisfies ApiHandler,
};

export const preset = {
  PATCH: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      return json({ preset: await updatePreset(userId, params.id, await readJson(request, meditationPresetSchema)) });
    })) satisfies ApiHandler,
  DELETE: (({ request, params }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      await deletePreset(userId, params.id);
      return noContent();
    })) satisfies ApiHandler,
};

export const timer = {
  PATCH: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      const { seconds } = await readJson(request, meditationTimerSchema);
      return json({ defaultTimerSeconds: await setDefaultTimer(userId, seconds) });
    })) satisfies ApiHandler,
};

export const presence = {
  GET: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      return json(await meditatingNow(userId));
    })) satisfies ApiHandler,
  PUT: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      await ping(userId);
      return noContent();
    })) satisfies ApiHandler,
  DELETE: (({ request }) =>
    handler(async () => {
      const { userId } = await requireSession(request);
      await stop(userId);
      return noContent();
    })) satisfies ApiHandler,
};
