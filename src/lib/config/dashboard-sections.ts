export const DASHBOARD_SECTIONS = [
  { key: "goals", label: "Today's Goals" },
  { key: "counters", label: "Counters" },
  { key: "food", label: "Food" },
  { key: "recent", label: "Recent Activity" },
] as const;

export const DEFAULT_DASHBOARD_SECTIONS = ["goals", "counters", "food", "recent"];
