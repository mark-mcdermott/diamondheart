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

const reminderFields = {
  label: z.string().trim().min(1, "Label is required").max(100),
  /** 24-hour wall-clock time, `HH:MM`. */
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:MM"),
  /** Days of the week, 0 = Sunday. */
  days: z
    .array(z.number().int().min(0).max(6))
    .min(1, "Pick at least one day")
    .refine((d) => new Set(d).size === d.length, "Days must not repeat"),
  timezone: z.string().trim().min(1).max(64),
  enabled: z.boolean(),
  metricId: z.string().min(1).nullable(),
};

export const createReminderSchema = z
  .object({
    ...reminderFields,
    timezone: reminderFields.timezone.optional(),
    enabled: reminderFields.enabled.optional(),
    metricId: reminderFields.metricId.optional(),
  })
  .strict();

export const updateReminderSchema = z.object(reminderFields).partial().strict();

export type CreateReminder = z.infer<typeof createReminderSchema>;
export type UpdateReminder = z.infer<typeof updateReminderSchema>;

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

/** A calendar day as the user sees it, `YYYY-MM-DD`; parsed in local time like the pages do. */
export const calendarDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

const macro = z.number().min(0).finite();
const positive = z.number().positive().finite();

/** What a logged, favourited or saved food carries; the same columns on every food table. */
const foodFields = {
  name: z.string().trim().min(1, "Food name is required").max(200),
  fdcId: z.string().trim().min(1).max(32).nullable().optional(),
  servingSize: positive.optional(),
  servingUnit: z.string().trim().min(1).max(32).optional(),
  calories: macro.optional(),
  protein: macro.optional(),
  carbs: macro.optional(),
  fat: macro.optional(),
};

export const logFoodSchema = z
  .object({
    ...foodFields,
    date: calendarDay.optional(),
    mealType: z.enum(MEAL_TYPES),
    quantity: positive.optional(),
  })
  .strict();

export const createFavoriteFoodSchema = z
  .object({ ...foodFields, customFoodId: z.string().min(1).nullable().optional() })
  .strict();

export const createCustomFoodSchema = z
  .object({
    name: foodFields.name,
    servingSize: foodFields.servingSize,
    servingUnit: foodFields.servingUnit,
    calories: foodFields.calories,
    protein: foodFields.protein,
    carbs: foodFields.carbs,
    fat: foodFields.fat,
  })
  .strict();

export const saveMealSchema = z
  .object({
    name: z.string().trim().min(1, "Meal name is required").max(100),
    mealType: z.enum(MEAL_TYPES),
    date: calendarDay.optional(),
  })
  .strict();

export const logMealSchema = z.object({ mealType: z.enum(MEAL_TYPES), date: calendarDay.optional() }).strict();

export type LogFood = z.infer<typeof logFoodSchema>;
export type CreateFavoriteFood = z.infer<typeof createFavoriteFoodSchema>;
export type CreateCustomFood = z.infer<typeof createCustomFoodSchema>;
export type SaveMeal = z.infer<typeof saveMealSchema>;
export type LogMeal = z.infer<typeof logMealSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters").max(200),
  })
  .strict();

export const notificationReadSchema = z.object({ read: z.boolean() }).strict();

const shortText = (max = 100) => z.string().trim().min(1).max(max);
const optionalShort = (max = 100) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable();

const trackingFields = {
  name: shortText(100),
  category: optionalShort(100),
  count: z.number().int(),
  unit: optionalShort(32),
  icon: optionalShort(64),
  notes: optionalText,
};
export const createTrackingItemSchema = z
  .object({ ...trackingFields, category: trackingFields.category.optional(), count: trackingFields.count.optional(), unit: trackingFields.unit.optional(), icon: trackingFields.icon.optional(), notes: trackingFields.notes.optional() })
  .strict();
export const updateTrackingItemSchema = z.object(trackingFields).partial().strict();
export const trackingDeltaSchema = z.object({ delta: z.number().int().refine((d) => d !== 0, "Delta must not be zero") }).strict();

export const createMedicalLogSchema = z
  .object({
    type: shortText(64),
    subtype: optionalShort(64).optional(),
    severity: z.number().int().min(1).max(5).nullable().optional(),
    notes: optionalText.optional(),
    date: isoDate.optional(),
  })
  .strict();

const appointmentFields = {
  title: shortText(200),
  appointmentType: shortText(32),
  provider: optionalShort(200),
  location: optionalShort(200),
  date: isoDate,
  durationMinutes: z.number().int().positive().nullable(),
  status: shortText(32),
  notes: optionalText,
  followUp: optionalText,
};
export const createAppointmentSchema = z
  .object({
    ...appointmentFields,
    appointmentType: appointmentFields.appointmentType.optional(),
    provider: appointmentFields.provider.optional(),
    location: appointmentFields.location.optional(),
    durationMinutes: appointmentFields.durationMinutes.optional(),
    status: appointmentFields.status.optional(),
    notes: appointmentFields.notes.optional(),
    followUp: appointmentFields.followUp.optional(),
  })
  .strict();
export const updateAppointmentSchema = z.object(appointmentFields).partial().strict();

export type CreateTrackingItem = z.infer<typeof createTrackingItemSchema>;
export type UpdateTrackingItem = z.infer<typeof updateTrackingItemSchema>;
export type CreateMedicalLog = z.infer<typeof createMedicalLogSchema>;
export type CreateAppointment = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointment = z.infer<typeof updateAppointmentSchema>;
