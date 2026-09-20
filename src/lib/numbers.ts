/**
 * Reading numbers out of form data.
 *
 * The pattern this replaces was `parseInt(value) || fallback`, which fails two
 * ways at once:
 *
 *   parseInt("0.5") || 1   ->  1    half a serving becomes a whole one
 *   parseInt("0")   || 1   ->  1    a legitimate zero becomes one
 *
 * The first is truncation, the second is `0` being falsy. Both silently
 * disagree with what the user typed.
 */
export function parseNumberField(
  raw: FormDataEntryValue | null | undefined,
  fallback: number
): number {
  if (raw === null || raw === undefined) return fallback;

  const text = String(raw).trim();
  if (text === "") return fallback;

  const value = Number(text);
  return Number.isFinite(value) ? value : fallback;
}

/** Same, but refuses values that make no sense as a quantity or measurement. */
export function parsePositiveNumberField(
  raw: FormDataEntryValue | null | undefined,
  fallback: number
): number {
  const value = parseNumberField(raw, fallback);
  return value > 0 ? value : fallback;
}
