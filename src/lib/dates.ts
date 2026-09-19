export function parseDate(dateStr: string | undefined): Date {
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const parsed = new Date(y, m - 1, d);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Half-open [start, end) covering the calendar day `date` falls on. */
export function dayBounds(date: Date): { start: Date; end: Date } {
  const start = startOfDay(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function todayStart(): Date {
  return startOfDay(new Date());
}

export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}
