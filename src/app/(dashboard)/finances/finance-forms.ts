/**
 * The finance forms speak dollars and date strings; the API speaks integer
 * cents and ISO dates. The conversion used to live in the action file, once;
 * now it lives here, once, on the client side of the wire.
 */

/** Every finance write refetches the whole section: the overview, the lists and the month summary all share the prefix. */
export const REFETCH_FINANCES = [["finances"]] as const;

export function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function dollarsToCents(raw: string, fallback = 0): number {
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? Math.round(n * 100) : fallback;
}

export function optionalCents(formData: FormData, key: string): number | null {
  const raw = text(formData, key);
  return raw ? dollarsToCents(raw) : null;
}

/** A date input's value as an ISO instant, or null when empty or unparseable. */
export function optionalIsoDate(formData: FormData, key: string): string | null {
  const raw = text(formData, key);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function optionalInt(formData: FormData, key: string): number | null {
  const raw = text(formData, key);
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isInteger(n) ? n : null;
}

export function optionalText(formData: FormData, key: string): string | null {
  return text(formData, key) || null;
}
