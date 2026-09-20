import { z } from "zod";
import { MASS_UNITS } from "@/lib/units";
import { DASHBOARD_SECTIONS } from "@/lib/config/dashboard-sections";
import { MACRO_KEYS } from "@/lib/targets";

/**
 * Request-body shapes for the whole API, declared once so a handler is a
 * query plus an ownership check. Every update schema is partial and strict:
 * an omitted key is left alone, an explicit `null` clears a nullable column,
 * and an unknown key is a 422 rather than a silent no-op.
 */

const dashboardSectionKey = z.enum(
  DASHBOARD_SECTIONS.map((s) => s.key) as [string, ...string[]]
);

/** A daily target: a positive number, or null for "not set". */
const target = z.number().positive().finite().nullable();

export const updatePreferencesSchema = z
  .object({
    useNetflixUI: z.boolean(),
    showSiteName: z.boolean(),
    showMeditationInFeed: z.boolean(),
    showNameWhenMeditating: z.boolean(),
    weightUnit: z.enum(MASS_UNITS),
    dashboardSections: z
      .array(dashboardSectionKey)
      .refine((keys) => new Set(keys).size === keys.length, "Sections must not repeat"),
    targets: z
      .object(Object.fromEntries(MACRO_KEYS.map((k) => [k, target])) as Record<(typeof MACRO_KEYS)[number], typeof target>)
      .partial()
      .strict(),
  })
  .partial()
  .strict();

export type UpdatePreferences = z.infer<typeof updatePreferencesSchema>;
