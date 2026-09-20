import type { TrackerCategory, TrackerEntry, TrackerMetric } from "@/db/schema";
import type {
  CreateAppointment,
  CreateCustomFood,
  CreateEntry,
  CreateFavoriteFood,
  CreateMedicalLog,
  CreateMetric,
  CreateTrackingItem,
  LogFood,
  LogMeal,
  SaveMeal,
  UpdateAppointment,
  UpdateEntry,
  UpdateMetric,
  UpdatePreferences,
  UpdateTrackingItem,
} from "@/server/api/_lib/schemas";
import type { Appointment } from "@/server/api/appointments";
import type { CustomFood, FavoriteFood, FavoriteMeal, FoodDay, FoodLogItem, MacroTotals } from "@/server/api/food";
import type { Dashboard } from "@/server/api/dashboard";
import type { MedicalLog, MedicalTotals } from "@/server/api/medical";
import type { MetricsOverview } from "@/server/api/metrics";
import type { Preferences } from "@/server/api/preferences";
import type { TrackingItem } from "@/server/api/tracking";

/**
 * The applet's whole view of the API (docs/PORT-PLAN.md, Phase 3).
 *
 * Every endpoint wraps its payload — `{ preferences }`, `{ items }` — so these
 * helpers unwrap once here rather than at every call site, and they own the
 * query keys so a mutation cannot invalidate a key a list is not cached under.
 *
 * `API_BASE` is empty on the web (same origin, cookie auth). The bundled
 * native build sets it to the deployed origin and authenticates with a bearer
 * token instead (Phase 5).
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fields?: Record<string, string[]>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined) headers.set("content-type", "application/json");

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (response.status === 401) {
    // The session is gone — expired, or signed out in another tab. Sending them
    // to sign in beats rendering an empty screen that looks like they own nothing.
    if (typeof window !== "undefined") window.location.assign("/login");
    throw new ApiError(401, "Not signed in");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string; fields?: Record<string, string[]> };
    throw new ApiError(response.status, body.error ?? "Something went wrong.", body.fields);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

/** A nav item as it crosses the wire: the columns the UI reads, dates as strings. */
export interface NavItem {
  id: string;
  label: string;
  href: string;
  itemType: string;
  referenceId: string | null;
  sortOrder: number;
  visible: boolean;
  locked: boolean;
}

/** A row as JSON delivers it: every `Date` column is an ISO string. */
export type Serialized<T> = { [K in keyof T]: T[K] extends Date ? string : T[K] };

export type Metric = Serialized<TrackerMetric>;
export type Category = Serialized<TrackerCategory>;
export type Entry = Serialized<TrackerEntry>;
export type FoodItem = Serialized<FoodLogItem>;
export type FoodDayView = Omit<FoodDay, "meals"> & { meals: Record<keyof FoodDay["meals"], FoodItem[]> };
export type Favorite = Serialized<FavoriteFood>;
export type SavedMeal = Omit<Serialized<FavoriteMeal>, "items"> & { items: FavoriteMeal["items"] };
export type DailyTotal = MacroTotals & { date: string };
export type DashboardEntry = { id: string; metricId: string; value: string; date: string };
export type DashboardView = Omit<Dashboard, "metrics" | "todayEntries" | "recentEntries"> & {
  metrics: Metric[];
  todayEntries: DashboardEntry[];
  recentEntries: DashboardEntry[];
};
export interface MetricDetail {
  metric: Metric;
  /** Newest first, values as stored in the metric's own unit. */
  entries: Entry[];
}
export type Overview = Omit<MetricsOverview, "categories" | "metrics"> & { categories: Category[]; metrics: Metric[] };
export type TrackingItemView = Serialized<TrackingItem>;
export type MedicalLogView = Serialized<MedicalLog>;
export type AppointmentView = Serialized<Appointment>;
/** A timestamp crosses the wire as an ISO string; the server's schema turns it into a `Date`. */
export type CreateMedicalLogInput = Omit<CreateMedicalLog, "date"> & { date?: string };
export type CreateAppointmentInput = Omit<CreateAppointment, "date"> & { date: string };
export type UpdateAppointmentInput = Omit<UpdateAppointment, "date"> & { date?: string };

export const keys = {
  preferences: ["preferences"] as const,
  nav: ["nav"] as const,
  metricsOverview: ["metrics", "overview"] as const,
  metrics: ["metrics", "list"] as const,
  metric: (id: string) => ["metrics", id] as const,
  foodDay: (date: string) => ["food", "day", date] as const,
  foodFavorites: ["food", "favorites"] as const,
  foodMeals: ["food", "meals"] as const,
  foodTotals: (from: string, to: string) => ["food", "totals", from, to] as const,
  dashboard: (date: string) => ["dashboard", date] as const,
  tracking: ["tracking"] as const,
  medical: ["medical", "logs"] as const,
  medicalTotals: (from: string, to: string) => ["medical", "totals", from, to] as const,
  appointments: ["appointments"] as const,
};

export const api = {
  preferences: {
    get: () => request<{ preferences: Preferences }>("/api/preferences").then((r) => r.preferences),
    update: (patch: UpdatePreferences) =>
      request<{ preferences: Preferences }>("/api/preferences", { method: "PATCH", ...json(patch) }).then((r) => r.preferences),
  },
  nav: {
    list: () => request<{ items: NavItem[] }>("/api/nav").then((r) => r.items),
    reorder: (ids: string[]) =>
      request<{ items: NavItem[] }>("/api/nav", { method: "PATCH", ...json({ ids }) }).then((r) => r.items),
    setVisible: (id: string, visible: boolean) =>
      request<{ items: NavItem[] }>(`/api/nav/${id}`, { method: "PATCH", ...json({ visible }) }).then((r) => r.items),
    setCategory: (categoryId: string, visible: boolean) =>
      request<{ items: NavItem[] }>(`/api/nav/categories/${categoryId}`, { method: "PUT", ...json({ visible }) }).then((r) => r.items),
    setSection: (key: string, visible: boolean) =>
      request<{ items: NavItem[] }>(`/api/nav/sections/${key}`, { method: "PUT", ...json({ visible }) }).then((r) => r.items),
  },
  metrics: {
    overview: () => request<Overview>("/api/metrics/overview"),
    list: () => request<{ metrics: Metric[] }>("/api/metrics").then((r) => r.metrics),
    get: (id: string) => request<MetricDetail>(`/api/metrics/${id}`),
    create: (input: CreateMetric) => request<{ metric: Metric }>("/api/metrics", { method: "POST", ...json(input) }).then((r) => r.metric),
    update: (id: string, patch: UpdateMetric) =>
      request<{ metric: Metric }>(`/api/metrics/${id}`, { method: "PATCH", ...json(patch) }).then((r) => r.metric),
    remove: (id: string) => request<void>(`/api/metrics/${id}`, { method: "DELETE" }),
    reorder: (ids: string[]) =>
      request<{ metrics: Metric[] }>("/api/metrics", { method: "PATCH", ...json({ ids }) }).then((r) => r.metrics),
  },
  entries: {
    /** `date` and `unit` are optional: now, and the metric's own unit. 200 means a single-value metric replaced the day's entry. */
    create: (metricId: string, input: Omit<CreateEntry, "date"> & { date?: string }) =>
      request<{ entry: Entry }>(`/api/metrics/${metricId}/entries`, { method: "POST", ...json(input) }).then((r) => r.entry),
    update: (id: string, patch: UpdateEntry) =>
      request<{ entry: Entry }>(`/api/entries/${id}`, { method: "PATCH", ...json(patch) }).then((r) => r.entry),
    remove: (id: string) => request<void>(`/api/entries/${id}`, { method: "DELETE" }),
  },
  dashboard: {
    get: (date: string) => request<DashboardView>(`/api/dashboard?date=${date}`),
  },
  food: {
    day: (date: string) => request<FoodDayView>(`/api/food/log?date=${date}`),
    log: (input: LogFood) => request<{ item: FoodItem }>("/api/food/log", { method: "POST", ...json(input) }).then((r) => r.item),
    removeItem: (id: string) => request<void>(`/api/food/log/items/${id}`, { method: "DELETE" }),
    totals: (from: string, to: string) => request<{ days: DailyTotal[] }>(`/api/food/totals?from=${from}&to=${to}`).then((r) => r.days),
    favorites: () => request<{ favorites: Favorite[] }>("/api/food/favorites").then((r) => r.favorites),
    favorite: (input: CreateFavoriteFood) =>
      request<{ favorite: Favorite }>("/api/food/favorites", { method: "POST", ...json(input) }).then((r) => r.favorite),
    unfavorite: (id: string) => request<void>(`/api/food/favorites/${id}`, { method: "DELETE" }),
    createCustom: (input: CreateCustomFood) =>
      request<{ customFood: Serialized<CustomFood> }>("/api/food/custom", { method: "POST", ...json(input) }).then((r) => r.customFood),
    meals: () => request<{ meals: SavedMeal[] }>("/api/food/meals").then((r) => r.meals),
    saveMeal: (input: SaveMeal) => request<{ meal: SavedMeal }>("/api/food/meals", { method: "POST", ...json(input) }).then((r) => r.meal),
    deleteMeal: (id: string) => request<void>(`/api/food/meals/${id}`, { method: "DELETE" }),
    logMeal: (id: string, input: LogMeal) =>
      request<{ items: FoodItem[] }>(`/api/food/meals/${id}/log`, { method: "POST", ...json(input) }).then((r) => r.items),
  },
  categories: {
    create: (name: string) => request<{ category: Category }>("/api/categories", { method: "POST", ...json({ name }) }).then((r) => r.category),
    rename: (id: string, name: string) =>
      request<{ category: Category }>(`/api/categories/${id}`, { method: "PATCH", ...json({ name }) }).then((r) => r.category),
    remove: (id: string) => request<void>(`/api/categories/${id}`, { method: "DELETE" }),
  },
  tracking: {
    list: () => request<{ items: TrackingItemView[] }>("/api/tracking").then((r) => r.items),
    create: (input: CreateTrackingItem) =>
      request<{ item: TrackingItemView }>("/api/tracking", { method: "POST", ...json(input) }).then((r) => r.item),
    update: (id: string, patch: UpdateTrackingItem) =>
      request<{ item: TrackingItemView }>(`/api/tracking/${id}`, { method: "PATCH", ...json(patch) }).then((r) => r.item),
    remove: (id: string) => request<void>(`/api/tracking/${id}`, { method: "DELETE" }),
    /** Adds `delta` (never zero) to the count on the server, so two quick taps both land. */
    adjust: (id: string, delta: number) =>
      request<{ item: TrackingItemView }>(`/api/tracking/${id}/count`, { method: "POST", ...json({ delta }) }).then((r) => r.item),
  },
  medical: {
    list: () => request<{ logs: MedicalLogView[] }>("/api/medical").then((r) => r.logs),
    create: (input: CreateMedicalLogInput) =>
      request<{ log: MedicalLogView }>("/api/medical", { method: "POST", ...json(input) }).then((r) => r.log),
    remove: (id: string) => request<void>(`/api/medical/${id}`, { method: "DELETE" }),
    totals: (from: string, to: string) => request<MedicalTotals>(`/api/medical/totals?from=${from}&to=${to}`),
  },
  appointments: {
    list: () => request<{ appointments: AppointmentView[] }>("/api/appointments").then((r) => r.appointments),
    create: (input: CreateAppointmentInput) =>
      request<{ appointment: AppointmentView }>("/api/appointments", { method: "POST", ...json(input) }).then((r) => r.appointment),
    update: (id: string, patch: UpdateAppointmentInput) =>
      request<{ appointment: AppointmentView }>(`/api/appointments/${id}`, { method: "PATCH", ...json(patch) }).then((r) => r.appointment),
    remove: (id: string) => request<void>(`/api/appointments/${id}`, { method: "DELETE" }),
  },
};

export type { Preferences, UpdatePreferences, CreateMetric, UpdateMetric, CreateEntry, UpdateEntry, CreateTrackingItem, UpdateTrackingItem, MedicalTotals };

/** What to show a person when a call fails: the first field message, else the error, else a generic line. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const field = error.fields ? Object.values(error.fields)[0]?.[0] : undefined;
    return field ?? error.message;
  }
  return "Something went wrong. Please try again.";
}
