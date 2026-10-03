import { displayUnitFor, isMassUnit, roundMass, toDisplayValue, type MassUnit } from "./units";

interface GoalSource {
  dailyGoal: number | null;
  unit: string | null;
  singleValuePerDay: boolean;
}

/**
 * The goal a metric is shown with. Stored in the metric's own unit, so a mass
 * goal is converted to the viewer's. A metric that takes one reading a day
 * (weight) has no amount to aim at — its stored goal of 1 means "log it" — so
 * it has no display goal at all.
 */
export function displayGoal(metric: GoalSource, preferred: MassUnit): number | null {
  if (metric.singleValuePerDay || metric.dailyGoal === null) return null;
  const shown = toDisplayValue(metric.dailyGoal, metric.unit, preferred);
  return isMassUnit(metric.unit) ? roundMass(shown) : shown;
}

/** What a tile says under the metric's name. */
export function goalLabel(metric: GoalSource, preferred: MassUnit): string {
  const goal = displayGoal(metric, preferred);
  const unit = displayUnitFor(metric.unit, preferred);
  if (goal === null || (goal === 1 && !unit)) return "once a day";
  return `goal: ${goal}${unit ? ` ${unit}` : ""}`;
}

/** A reading or a day's total in the viewer's unit, with that unit. */
export function formatReading(value: number, metricUnit: string | null, preferred: MassUnit): string {
  const unit = displayUnitFor(metricUnit, preferred);
  const shown = toDisplayValue(value, metricUnit, preferred);
  const number = isMassUnit(metricUnit) ? roundMass(shown) : Number.isInteger(shown) ? shown : Number(shown.toFixed(1));
  return unit ? `${number} ${unit}` : String(number);
}
