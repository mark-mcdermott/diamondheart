/**
 * Daily food targets.
 *
 * A target is `null` until the user sets one. That is deliberate: the metric
 * detail page once rendered "Daily goal: 1 kg" for weight because a missing
 * goal was defaulted to 1. Progress toward a number nobody chose is worse than
 * no progress at all, so absence stays absent all the way to the screen.
 */
export const MACRO_KEYS = ["calories", "protein", "carbs", "fat"] as const;
export type MacroKey = (typeof MACRO_KEYS)[number];

export type FoodTargets = Record<MacroKey, number | null>;

export const NO_TARGETS: FoodTargets = { calories: null, protein: null, carbs: null, fat: null };

export type TargetProgress = { ratio: number; over: boolean };

/** `null` when there is no usable target — never invent one. */
export function targetProgress(total: number, target: number | null | undefined): TargetProgress | null {
  if (target === null || target === undefined) return null;
  if (!Number.isFinite(target) || target <= 0) return null;
  if (!Number.isFinite(total)) return null;
  const ratio = total / target;
  return { ratio, over: ratio > 1 };
}

/**
 * Reads a target from a form field. Empty means "no target", which is a valid
 * and common answer; a non-positive or unparseable value is a mistake to
 * report, not something to silently coerce.
 */
export function parseTargetField(
  raw: FormDataEntryValue | null | undefined
): number | null | "invalid" {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim();
  if (text === "") return null;
  const value = Number(text);
  if (!Number.isFinite(value) || value <= 0) return "invalid";
  return value;
}
