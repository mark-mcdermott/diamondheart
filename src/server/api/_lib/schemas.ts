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

const seconds = z.number().int().positive("Duration is required");

export const createMeditationSessionSchema = z
  .object({
    /** Seconds. */
    duration: seconds,
    type: z.string().trim().min(1).max(64).optional(),
    notes: optionalText.optional(),
    date: isoDate.optional(),
  })
  .strict();

export const updateMeditationSessionSchema = z
  .object({ duration: seconds, type: z.string().trim().min(1).max(64), notes: optionalText })
  .partial()
  .strict();

export const meditationStyleSchema = z
  .object({ label: z.string().trim().min(1, "Label is required").max(64), iconName: z.string().trim().min(1).max(64).optional() })
  .strict();

export const meditationPresetSchema = z
  .object({ label: z.string().trim().min(1, "Label is required").max(64), seconds })
  .strict();

export const meditationTimerSchema = z.object({ seconds }).strict();

export type CreateMeditationSession = z.infer<typeof createMeditationSessionSchema>;
export type UpdateMeditationSession = z.infer<typeof updateMeditationSessionSchema>;
export type MeditationStyleInput = z.infer<typeof meditationStyleSchema>;
export type MeditationPresetInput = z.infer<typeof meditationPresetSchema>;

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

export const createWorkoutSchema = z.object({ name: optionalShort(200).optional() }).strict();
export const finishWorkoutSchema = z.object({ duration: z.number().int().min(0).nullable(), notes: optionalText }).partial().strict();
export const addSetSchema = z
  .object({
    exerciseId: z.string().min(1),
    reps: z.number().int().min(0),
    weight: z.number().int().min(0),
    unit: shortText(16).optional(),
    type: shortText(32).optional(),
    notes: optionalText.optional(),
  })
  .strict();

const entertainmentFields = {
  type: shortText(32),
  title: shortText(300),
  creator: optionalShort(200),
  status: shortText(32),
  rating: z.number().int().min(1).max(5).nullable(),
  notes: optionalText,
  startDate: isoDate.nullable(),
  endDate: isoDate.nullable(),
  imdbId: optionalShort(32),
  posterUrl: optionalShort(2000),
  overview: optionalText,
  releaseDate: optionalShort(32),
  genres: optionalShort(300),
  seasonCount: z.number().int().min(0).nullable(),
  episodeCount: z.number().int().min(0).nullable(),
  runtime: z.number().int().min(0).nullable(),
  voteAverage: optionalShort(16),
};
export const createEntertainmentSchema = z
  .object({
    type: entertainmentFields.type,
    title: entertainmentFields.title,
    creator: entertainmentFields.creator.optional(),
    status: entertainmentFields.status.optional(),
    rating: entertainmentFields.rating.optional(),
    notes: entertainmentFields.notes.optional(),
    startDate: entertainmentFields.startDate.optional(),
    endDate: entertainmentFields.endDate.optional(),
    imdbId: entertainmentFields.imdbId.optional(),
    posterUrl: entertainmentFields.posterUrl.optional(),
    overview: entertainmentFields.overview.optional(),
    releaseDate: entertainmentFields.releaseDate.optional(),
    genres: entertainmentFields.genres.optional(),
    seasonCount: entertainmentFields.seasonCount.optional(),
    episodeCount: entertainmentFields.episodeCount.optional(),
    runtime: entertainmentFields.runtime.optional(),
    voteAverage: entertainmentFields.voteAverage.optional(),
  })
  .strict();
export const updateEntertainmentSchema = z.object(entertainmentFields).partial().strict();

export const episodeWatchedSchema = z
  .object({
    seriesImdbId: shortText(32),
    episodeImdbId: shortText(32),
    watched: z.boolean(),
    season: z.number().int().min(0).optional(),
    episode: z.number().int().min(0).optional(),
    title: optionalShort(300).optional(),
    airDate: optionalShort(32).optional(),
  })
  .strict()
  .refine((v) => !v.watched || (v.season !== undefined && v.episode !== undefined), {
    message: "Season and episode are required to mark an episode watched",
    path: ["season"],
  });

export const reactionSchema = z.object({ reacted: z.boolean() }).strict();

export type CreateWorkout = z.infer<typeof createWorkoutSchema>;
export type FinishWorkout = z.infer<typeof finishWorkoutSchema>;
export type AddSet = z.infer<typeof addSetSchema>;
export type CreateEntertainment = z.infer<typeof createEntertainmentSchema>;
export type UpdateEntertainment = z.infer<typeof updateEntertainmentSchema>;
export type EpisodeWatched = z.infer<typeof episodeWatchedSchema>;

// --- finances: every amount is integer cents ------------------------------------
const cents = z.number().int();
const nonNegativeCents = z.number().int().min(0);
const decimalText = optionalShort(32);

const accountFields = {
  name: shortText(200),
  accountType: shortText(32),
  institution: optionalShort(200),
  balanceCents: cents,
  currency: shortText(8),
  notes: optionalText,
  archived: z.boolean(),
};
export const createFinanceAccountSchema = z
  .object({ ...accountFields, institution: accountFields.institution.optional(), balanceCents: cents.optional(), currency: accountFields.currency.optional(), notes: accountFields.notes.optional() })
  .omit({ archived: true })
  .strict();
export const updateFinanceAccountSchema = z.object(accountFields).partial().strict();

export const createFinanceCategorySchema = z
  .object({ name: shortText(100), type: z.enum(["income", "expense", "transfer"]).optional(), icon: optionalShort(64).optional() })
  .strict();

export const createTransactionSchema = z
  .object({
    accountId: z.string().min(1),
    categoryId: z.string().min(1).nullable().optional(),
    type: z.enum(["income", "expense", "transfer"]),
    /** The magnitude; the server signs it by type. */
    amountCents: z.number().int().positive(),
    description: shortText(300),
    merchant: optionalShort(200).optional(),
    date: isoDate.optional(),
    notes: optionalText.optional(),
    isRecurring: z.boolean().optional(),
  })
  .strict();
export const updateTransactionSchema = z
  .object({ categoryId: z.string().min(1).nullable(), description: shortText(300), merchant: optionalShort(200), notes: optionalText })
  .partial()
  .strict();
export const importTransactionsSchema = z
  .object({
    accountId: z.string().min(1),
    transactions: z
      .array(
        z.object({
          date: z.string().min(1).max(64),
          description: shortText(300),
          /** Dollars, as the CSV carries them. */
          amount: z.number().finite(),
          type: z.enum(["income", "expense"]),
          merchant: optionalShort(200).optional(),
          categoryId: z.string().min(1).nullable().optional(),
        })
      )
      .max(5000),
  })
  .strict();

export const setBudgetSchema = z.object({ categoryId: z.string().min(1), amountCents: nonNegativeCents, period: z.enum(["monthly", "weekly", "yearly"]).optional() }).strict();

const investmentFields = {
  accountId: z.string().min(1).nullable(),
  symbol: shortText(32),
  name: shortText(200),
  investmentType: shortText(32),
  /** Text so fractional shares keep their precision. */
  shares: z.string().trim().max(32),
  costBasisCents: nonNegativeCents,
  currentPriceCents: nonNegativeCents,
  vestingDate: isoDate.nullable(),
  expirationDate: isoDate.nullable(),
  strikePriceCents: nonNegativeCents.nullable(),
  grantDate: isoDate.nullable(),
  notes: optionalText,
};
export const createInvestmentSchema = z
  .object({
    symbol: investmentFields.symbol,
    name: investmentFields.name,
    investmentType: investmentFields.investmentType,
    accountId: investmentFields.accountId.optional(),
    shares: investmentFields.shares.optional(),
    costBasisCents: investmentFields.costBasisCents.optional(),
    currentPriceCents: investmentFields.currentPriceCents.optional(),
    vestingDate: investmentFields.vestingDate.optional(),
    expirationDate: investmentFields.expirationDate.optional(),
    strikePriceCents: investmentFields.strikePriceCents.optional(),
    grantDate: investmentFields.grantDate.optional(),
    notes: investmentFields.notes.optional(),
  })
  .strict();
export const updateInvestmentSchema = z.object(investmentFields).partial().strict();

const propertyFields = {
  name: shortText(200),
  address: optionalShort(300),
  purchasePriceCents: nonNegativeCents,
  currentValueCents: nonNegativeCents,
  purchaseDate: isoDate.nullable(),
  mortgageBalanceCents: nonNegativeCents,
  mortgageRatePercent: decimalText,
  mortgageMonthlyPaymentCents: nonNegativeCents.nullable(),
  propertyType: shortText(32),
  notes: optionalText,
};
export const createPropertySchema = z
  .object({
    name: propertyFields.name,
    address: propertyFields.address.optional(),
    purchasePriceCents: propertyFields.purchasePriceCents.optional(),
    currentValueCents: propertyFields.currentValueCents.optional(),
    purchaseDate: propertyFields.purchaseDate.optional(),
    mortgageBalanceCents: propertyFields.mortgageBalanceCents.optional(),
    mortgageRatePercent: propertyFields.mortgageRatePercent.optional(),
    mortgageMonthlyPaymentCents: propertyFields.mortgageMonthlyPaymentCents.optional(),
    propertyType: propertyFields.propertyType.optional(),
    notes: propertyFields.notes.optional(),
  })
  .strict();
export const updatePropertySchema = z.object(propertyFields).partial().strict();

const retirementFields = {
  name: shortText(200),
  planType: shortText(32),
  institution: optionalShort(200),
  balanceCents: nonNegativeCents,
  employerMatch: optionalShort(100),
  contributionYtdCents: nonNegativeCents,
  contributionLimitCents: nonNegativeCents.nullable(),
  targetRetirementAge: z.number().int().min(1).max(120).nullable(),
  monthlyContributionCents: nonNegativeCents.nullable(),
  expectedReturnPercent: decimalText,
  notes: optionalText,
};
export const createRetirementPlanSchema = z
  .object({
    name: retirementFields.name,
    planType: retirementFields.planType,
    institution: retirementFields.institution.optional(),
    balanceCents: retirementFields.balanceCents.optional(),
    employerMatch: retirementFields.employerMatch.optional(),
    contributionYtdCents: retirementFields.contributionYtdCents.optional(),
    contributionLimitCents: retirementFields.contributionLimitCents.optional(),
    targetRetirementAge: retirementFields.targetRetirementAge.optional(),
    monthlyContributionCents: retirementFields.monthlyContributionCents.optional(),
    expectedReturnPercent: retirementFields.expectedReturnPercent.optional(),
    notes: retirementFields.notes.optional(),
  })
  .strict();
export const updateRetirementPlanSchema = z.object(retirementFields).partial().strict();

export type CreateFinanceAccount = z.infer<typeof createFinanceAccountSchema>;
export type UpdateFinanceAccount = z.infer<typeof updateFinanceAccountSchema>;
export type CreateFinanceCategory = z.infer<typeof createFinanceCategorySchema>;
export type CreateTransaction = z.infer<typeof createTransactionSchema>;
export type UpdateTransaction = z.infer<typeof updateTransactionSchema>;
export type ImportTransactions = z.infer<typeof importTransactionsSchema>;
export type SetBudget = z.infer<typeof setBudgetSchema>;
export type CreateInvestment = z.infer<typeof createInvestmentSchema>;
export type UpdateInvestment = z.infer<typeof updateInvestmentSchema>;
export type CreateProperty = z.infer<typeof createPropertySchema>;
export type UpdateProperty = z.infer<typeof updatePropertySchema>;
export type CreateRetirementPlan = z.infer<typeof createRetirementPlanSchema>;
export type UpdateRetirementPlan = z.infer<typeof updateRetirementPlanSchema>;
