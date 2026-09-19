/**
 * Mass units for weight-style metrics.
 *
 * Readings are stored in the unit the metric declares (`tracker_metrics.unit`)
 * and converted only for display and input. Storing whatever unit the user
 * happened to be viewing would make history ambiguous the first time they
 * switched — a row of "80" would mean two different weights depending on when
 * it was written.
 */
export const MASS_UNITS = ["kg", "lb"] as const;
export type MassUnit = (typeof MASS_UNITS)[number];

/** US-based owner: imperial is the default people actually want to read. */
export const DEFAULT_MASS_UNIT: MassUnit = "lb";

const LB_PER_KG = 2.2046226218487757;

export function isMassUnit(unit: string | null | undefined): unit is MassUnit {
  return unit === "kg" || unit === "lb";
}

export function convertMass(value: number, from: MassUnit, to: MassUnit): number {
  if (from === to) return value;
  return from === "kg" ? value * LB_PER_KG : value / LB_PER_KG;
}

/** One decimal is the precision a bathroom scale actually offers. */
export function roundMass(value: number): number {
  return Math.round(value * 10) / 10;
}

export function formatMass(value: number, unit: MassUnit): string {
  return `${roundMass(value)} ${unit}`;
}

/**
 * Display unit for a metric: the user's preference when the metric measures
 * mass, otherwise the metric's own unit, which we must not reinterpret.
 */
export function displayUnitFor(
  metricUnit: string | null,
  preferred: MassUnit
): string | null {
  return isMassUnit(metricUnit) ? preferred : metricUnit;
}

/** Stored value -> what the user should see. */
export function toDisplayValue(
  value: number,
  metricUnit: string | null,
  preferred: MassUnit
): number {
  if (!isMassUnit(metricUnit)) return value;
  return convertMass(value, metricUnit, preferred);
}

/**
 * What the user typed -> what gets stored.
 *
 * Deliberately unrounded: storing lb input as 1-decimal kg makes 180 lb come
 * back as 179.9 lb. Precision is kept in storage and applied only on display.
 */
export function toStoredValue(
  value: number,
  metricUnit: string | null,
  preferred: MassUnit
): number {
  if (!isMassUnit(metricUnit)) return value;
  return convertMass(value, preferred, metricUnit);
}
