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

/** A full ordering of the caller's rows: every id once, nothing that is not theirs. */
export const reorderSchema = z
  .object({
    ids: z
      .array(z.string().min(1))
      .min(1)
      .refine((ids) => new Set(ids).size === ids.length, "Ids must not repeat"),
  })
  .strict();

export const navVisibilitySchema = z.object({ visible: z.boolean() }).strict();

const name = z.string().trim().min(1, "Name is required").max(100);
/** Free text where "" from an empty form field means "clear it". */
const optionalText = z
  .string()
  .trim()
  .max(2000)
  .transform((v) => v || null)
  .nullable();

export const createCategorySchema = z.object({ name }).strict();
export const updateCategorySchema = z.object({ name }).strict();

const metricFields = {
  name,
  valueType: z.string().trim().min(1).max(32),
  unit: z
    .string()
    .trim()
    .max(32)
    .transform((v) => v || null)
    .nullable(),
  dailyGoal: z.number().int().min(1, "Daily goal must be at least 1").nullable(),
  /** Field definitions for structured value types; stored as JSON as given. */
  fields: z.unknown().nullable(),
  categoryId: z.string().min(1).nullable(),
  counter: z.boolean(),
  singleValuePerDay: z.boolean(),
  hidden: z.boolean(),
};

export const createMetricSchema = z
  .object({
    ...metricFields,
    unit: metricFields.unit.optional(),
    dailyGoal: metricFields.dailyGoal.optional(),
    fields: metricFields.fields.optional(),
    categoryId: metricFields.categoryId.optional(),
    counter: metricFields.counter.optional(),
    singleValuePerDay: metricFields.singleValuePerDay.optional(),
  })
  .omit({ hidden: true })
  .strict();

export const updateMetricSchema = z.object(metricFields).partial().strict();

/** Timestamps cross the wire as ISO strings and reach Drizzle as `Date`. */
const isoDate = z.string().datetime({ offset: true }).transform((v) => new Date(v));

/** An entry value; "done" is what a bare quick-log records. */
const entryValue = z.string().trim().min(1).max(200);

export const createEntrySchema = z
  .object({
    value: entryValue.default("done"),
    date: isoDate.optional(),
    notes: optionalText.optional(),
    /** The unit `value` is expressed in when the metric measures mass; omitted means the metric's own. */
    unit: z.enum(MASS_UNITS).optional(),
  })
  .strict();

export const updateEntrySchema = z
  .object({
    value: entryValue,
    notes: optionalText,
    unit: z.enum(MASS_UNITS),
  })
  .partial()
  .strict();

export type CreateMetric = z.infer<typeof createMetricSchema>;
export type UpdateMetric = z.infer<typeof updateMetricSchema>;
export type CreateEntry = z.infer<typeof createEntrySchema>;
export type UpdateEntry = z.infer<typeof updateEntrySchema>;
