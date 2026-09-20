import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userPreferences } from "@/db/schema";
import { DEFAULT_DASHBOARD_SECTIONS } from "@/lib/config/dashboard-sections";
import { DEFAULT_MASS_UNIT, isMassUnit, type MassUnit } from "@/lib/units";
import { NO_TARGETS, type FoodTargets } from "@/lib/targets";
import type { ApiHandler } from "./_lib/context";
import { requireSession } from "./_lib/guard";
import { handler, json, readJson } from "./_lib/http";
import { updatePreferencesSchema, type UpdatePreferences } from "./_lib/schemas";

export interface Preferences {
  useNetflixUI: boolean;
  showSiteName: boolean;
  showMeditationInFeed: boolean;
  showNameWhenMeditating: boolean;
  weightUnit: MassUnit;
  targets: FoodTargets;
  dashboardSections: string[];
}

const DEFAULT_PREFERENCES: Preferences = {
  useNetflixUI: true,
  showSiteName: true,
  showMeditationInFeed: true,
  showNameWhenMeditating: true,
  weightUnit: DEFAULT_MASS_UNIT,
  targets: NO_TARGETS,
  dashboardSections: DEFAULT_DASHBOARD_SECTIONS,
};

/**
 * A user's preferences, with defaults for anyone who has never saved any.
 * Shared by the endpoint and, until Phase 3 retires them, the server components
 * that still render preferences directly.
 */
export async function readPreferences(userId: string): Promise<Preferences> {
  const [prefs] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  if (!prefs) return DEFAULT_PREFERENCES;

  return {
    useNetflixUI: prefs.useNetflixUI,
    showSiteName: prefs.showSiteName,
    showMeditationInFeed: prefs.showMeditationInFeed,
    showNameWhenMeditating: prefs.showNameWhenMeditating,
    // A value written before this column existed, or by hand, must not break display.
    weightUnit: isMassUnit(prefs.weightUnit) ? prefs.weightUnit : DEFAULT_MASS_UNIT,
    targets: {
      calories: prefs.calorieTarget ?? null,
      protein: prefs.proteinTarget ?? null,
      carbs: prefs.carbsTarget ?? null,
      fat: prefs.fatTarget ?? null,
    },
    dashboardSections: (prefs.dashboardSections as string[] | null) ?? DEFAULT_DASHBOARD_SECTIONS,
  };
}

type PreferenceColumns = Partial<typeof userPreferences.$inferInsert>;

/** Only the keys the caller sent become columns, so PATCH is genuinely partial. */
function toColumns(patch: UpdatePreferences): PreferenceColumns {
  const columns: PreferenceColumns = {};
  if (patch.useNetflixUI !== undefined) columns.useNetflixUI = patch.useNetflixUI;
  if (patch.showSiteName !== undefined) columns.showSiteName = patch.showSiteName;
  if (patch.showMeditationInFeed !== undefined) columns.showMeditationInFeed = patch.showMeditationInFeed;
  if (patch.showNameWhenMeditating !== undefined) columns.showNameWhenMeditating = patch.showNameWhenMeditating;
  if (patch.weightUnit !== undefined) columns.weightUnit = patch.weightUnit;
  if (patch.dashboardSections !== undefined) columns.dashboardSections = patch.dashboardSections;
  if (patch.targets) {
    const t = patch.targets;
    if (t.calories !== undefined) columns.calorieTarget = t.calories;
    if (t.protein !== undefined) columns.proteinTarget = t.protein;
    if (t.carbs !== undefined) columns.carbsTarget = t.carbs;
    if (t.fat !== undefined) columns.fatTarget = t.fat;
  }
  return columns;
}

export const GET: ApiHandler = ({ request }) =>
  handler(async () => {
    const { userId } = await requireSession(request);
    return json({ preferences: await readPreferences(userId) });
  });

export const PATCH: ApiHandler = ({ request }) =>
  handler(async () => {
    const { userId } = await requireSession(request);
    const patch = await readJson(request, updatePreferencesSchema);
    const columns = toColumns(patch);

    // `user_id` is unique, so one upsert replaces the select-then-branch the
    // server actions each carried. An empty patch still answers with the
    // current preferences rather than writing a row of defaults.
    if (Object.keys(columns).length > 0) {
      await db
        .insert(userPreferences)
        .values({ id: crypto.randomUUID(), userId, ...columns })
        .onConflictDoUpdate({
          target: userPreferences.userId,
          set: { ...columns, updatedAt: new Date() },
        });
    }

    return json({ preferences: await readPreferences(userId) });
  });
