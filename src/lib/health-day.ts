/** The readings taken from Apple Health, one value per calendar day. */
export const HEALTH_FIELDS = ["steps", "activeCalories", "restingHeartRate", "hrv", "spo2", "sleepDuration"] as const;

export type HealthField = (typeof HEALTH_FIELDS)[number];

/**
 * One day as the phone posts it: `date` is the user's calendar day
 * (`YYYY-MM-DD`), sleep is in hours, SpO2 in percent, and a reading Health has
 * nothing for is left out rather than sent as zero.
 */
export type HealthDay = { date: string } & Partial<Record<HealthField, number>>;
