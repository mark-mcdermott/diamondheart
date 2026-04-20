export type WeekBarState = "met" | "partial" | "empty";

export interface WeekBar {
  value: number;
  ratio: number;
  state: WeekBarState;
  isToday: boolean;
}

export interface WeekBarEntry {
  metricId: string;
  value: string;
  date: string | Date;
}

export function buildWeekBars(
  metricId: string,
  goal: number,
  entries: readonly WeekBarEntry[],
  referenceDate: Date = new Date(),
): WeekBar[] {
  const startOfDay = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );
  const threshold = goal > 0 ? goal : 1;

  const bars: WeekBar[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(startOfDay);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    let value = 0;
    for (const entry of entries) {
      if (entry.metricId !== metricId) continue;
      const d = entry.date instanceof Date ? entry.date : new Date(entry.date);
      if (d < dayStart || d >= dayEnd) continue;
      const parsed = parseFloat(entry.value);
      value += Number.isFinite(parsed) ? parsed : 1;
    }

    const state: WeekBarState =
      value <= 0 ? "empty" : value >= threshold ? "met" : "partial";
    const ratio = Math.min(1, Math.max(0, value / threshold));
    bars.push({ value, ratio, state, isToday: i === 0 });
  }
  return bars;
}
