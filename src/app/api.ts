import type { MeditationPreset, MeditationSession, MeditationStyle, Notification, TrackerCategory, TrackerEntry, TrackerMetric } from "@/db/schema";
import type {
  AddSet,
  CreateAppointment,
  CreateCustomFood,
  CreateEntertainment,
  CreateFinanceAccount,
  CreateFinanceCategory,
  CreateInvestment,
  CreateProperty,
  CreateRetirementPlan,
  CreateTransaction,
  CreateEntry,
  CreateFavoriteFood,
  CreateMedicalLog,
  CreateMeditationSession,
  CreateMetric,
  CreateTrackingItem,
  CreateWorkout,
  EpisodeWatched,
  FinishWorkout,
  ImportTransactions,
  LogFood,
  LogMeal,
  MeditationPresetInput,
  MeditationStyleInput,
  SaveMeal,
  SetBudget,
  UpdateAppointment,
  UpdateEntertainment,
  UpdateEntry,
  UpdateFinanceAccount,
  UpdateInvestment,
  UpdateMeditationSession,
  UpdateMetric,
  UpdatePreferences,
  UpdateProperty,
  UpdateRetirementPlan,
  UpdateTrackingItem,
  UpdateTransaction,
} from "@/server/api/_lib/schemas";
import type { Appointment } from "@/server/api/appointments";
import type { SessionUser } from "@/server/api/auth";
import type { CustomFood, FavoriteFood, FavoriteMeal, FoodDay, FoodLogItem, MacroTotals } from "@/server/api/food";
import type { Dashboard } from "@/server/api/dashboard";
import type { EntertainmentItem, EntertainmentTotals, ShowEpisode } from "@/server/api/entertainment";
import type { FeedItem } from "@/server/api/feed";
import type {
  Budget,
  FinanceAccount,
  FinanceCategory,
  FinanceOverview,
  Investment,
  MonthSummary,
  NetWorth,
  Property,
  RetirementPlan,
  Snapshot,
  Transaction,
} from "@/server/api/finances";
import type { MedicalLog, MedicalTotals } from "@/server/api/medical";
import type { IntegrationConnection } from "@/server/api/integrations";
import type { MeditatingNow, MeditationOverview } from "@/server/api/meditation";
import type { MetricsOverview } from "@/server/api/metrics";
import type { Preferences } from "@/server/api/preferences";
import type { TrackingItem } from "@/server/api/tracking";
import type { Exercise, PersonalRecordRow, Workout, WorkoutSet } from "@/server/api/workout";
import type { ReminderSchedule } from "@/db/schema";
import { getToken } from "@/lib/session-token";

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

export const API_BASE = import.meta.env.NEXT_PUBLIC_API_BASE ?? "";

/**
 * What happens when the session is gone. On the web the browser goes to sign
 * in; the native bundle swaps that for clearing its token and showing its own
 * sign-in screen (`native/NativeRoot.tsx`).
 */
let onUnauthorized: () => void = () => {
  if (typeof window !== "undefined") window.location.assign("/login");
};

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

/**
 * `fetch` against the API: the base URL prefixed and, when the bundle holds a
 * bearer token, the `Authorization` header set. Returns the raw `Response`, for
 * the callers that want the status or a stream rather than the JSON envelope.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  for (const [name, value] of Object.entries(authHeaders())) {
    if (!headers.has(name)) headers.set(name, value);
  }
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

/** The bearer header, for a client that fetches the site on its own rather than through `apiFetch`. */
export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}

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

  const response = await apiFetch(path, { ...init, headers });

  if (response.status === 401) {
    // The session is gone — expired, or signed out in another tab. Sending them
    // to sign in beats rendering an empty screen that looks like they own nothing.
    onUnauthorized();
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

/** A row as JSON delivers it: every `Date` column is an ISO string, a nullable one a nullable string. */
type SerializedValue<V> = V extends Date ? string : V;
export type Serialized<T> = { [K in keyof T]: SerializedValue<T[K]> };

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
export type MeditationSessionView = Serialized<MeditationSession>;
export type MeditationStyleView = Serialized<MeditationStyle>;
export type MeditationPresetView = Serialized<MeditationPreset>;
export type MeditationOverviewView = Omit<MeditationOverview, "sessions" | "styles" | "presets"> & {
  sessions: MeditationSessionView[];
  styles: MeditationStyleView[];
  presets: MeditationPresetView[];
};
export type CreateMeditationSessionInput = Omit<CreateMeditationSession, "date"> & { date?: string };
/** One calendar day of meditation, minutes summed across its sessions. */
export interface MeditationDay {
  date: string;
  minutes: number;
  sessions: number;
}
export type FeedItemView = Serialized<FeedItem>;
export type NotificationView = Serialized<Notification>;
export type WorkoutView = Serialized<Workout>;
export type ExerciseView = Serialized<Exercise>;
export type WorkoutSetView = Serialized<WorkoutSet>;
export interface WorkoutOverviewView {
  /** Built-in exercises first, then the caller's custom ones. */
  exercises: ExerciseView[];
  /** Newest first, at most five hundred. */
  recentWorkouts: WorkoutView[];
  active: { workout: WorkoutView; sets: WorkoutSetView[] } | null;
}
/** One calendar day of training: minutes, weight moved, and how many sessions. */
export interface WorkoutDay {
  date: string;
  duration: number;
  volume: number;
  sessions: number;
}
export type EntertainmentItemView = Serialized<EntertainmentItem>;
export type ShowEpisodeView = Serialized<ShowEpisode>;
export type CreateEntertainmentInput = Omit<CreateEntertainment, "startDate" | "endDate"> & { startDate?: string | null; endDate?: string | null };
export type UpdateEntertainmentInput = Omit<UpdateEntertainment, "startDate" | "endDate"> & { startDate?: string | null; endDate?: string | null };
export type FinanceAccountView = Serialized<FinanceAccount>;
export type FinanceCategoryView = Serialized<FinanceCategory>;
export type TransactionView = Serialized<Transaction>;
export type BudgetView = Serialized<Budget>;
export type InvestmentView = Serialized<Investment>;
export type PropertyView = Serialized<Property>;
export type RetirementPlanView = Serialized<RetirementPlan>;
export type SnapshotView = Serialized<Snapshot>;
export type MonthSummaryView = MonthSummary & { year: number; month: number };
export type FinanceOverviewView = Omit<FinanceOverview, "accounts" | "investments" | "properties" | "retirementPlans" | "snapshots" | "recentTransactions" | "categories"> & {
  accounts: FinanceAccountView[];
  investments: InvestmentView[];
  properties: PropertyView[];
  retirementPlans: RetirementPlanView[];
  snapshots: SnapshotView[];
  recentTransactions: TransactionView[];
  categories: FinanceCategoryView[];
};
export type CreateTransactionInput = Omit<CreateTransaction, "date"> & { date?: string };
export type CreateInvestmentInput = Omit<CreateInvestment, "vestingDate" | "expirationDate" | "grantDate"> & {
  vestingDate?: string | null;
  expirationDate?: string | null;
  grantDate?: string | null;
};
export type UpdateInvestmentInput = Omit<UpdateInvestment, "vestingDate" | "expirationDate" | "grantDate"> & {
  vestingDate?: string | null;
  expirationDate?: string | null;
  grantDate?: string | null;
};
export type CreatePropertyInput = Omit<CreateProperty, "purchaseDate"> & { purchaseDate?: string | null };
export type ReminderView = Omit<Serialized<ReminderSchedule>, "days"> & { days: number[] };
export type IntegrationConnectionView = Serialized<IntegrationConnection>;
export type PersonalRecordView = Serialized<PersonalRecordRow>;
export type UpdatePropertyInput = Omit<UpdateProperty, "purchaseDate"> & { purchaseDate?: string | null };

export const keys = {
  me: ["auth", "me"] as const,
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
  meditation: ["meditation", "overview"] as const,
  meditationTotals: (from: string, to: string) => ["meditation", "totals", from, to] as const,
  meditatingNow: ["meditation", "presence"] as const,
  feed: ["feed"] as const,
  notifications: ["notifications"] as const,
  workout: (active: string | null) => ["workout", "overview", active] as const,
  workoutTotals: (from: string, to: string) => ["workout", "totals", from, to] as const,
  entertainment: ["entertainment", "items"] as const,
  entertainmentTotals: ["entertainment", "totals"] as const,
  watchedEpisodes: (series: string) => ["entertainment", "episodes", series] as const,
  finances: ["finances", "overview"] as const,
  financeAccounts: ["finances", "accounts"] as const,
  financeCategories: ["finances", "categories"] as const,
  financeTransactions: (limit: number) => ["finances", "transactions", limit] as const,
  financeMonth: (year: number, month: number) => ["finances", "month", year, month] as const,
  financeBudgets: ["finances", "budgets"] as const,
  financeInvestments: ["finances", "investments"] as const,
  financeProperties: ["finances", "properties"] as const,
  financeRetirement: ["finances", "retirement"] as const,
  reminders: ["reminders"] as const,
  integrations: ["integrations"] as const,
  records: ["workout", "records"] as const,
};

export const api = {
  auth: {
    /** Signed-out is `null`, not an error: the endpoint answers 200 either way. */
    me: () => request<{ user: SessionUser | null }>("/api/auth/me").then((r) => r.user),
  },
  account: {
    /** A wrong current password is a 422 on `currentPassword`, not a 401; the session is fine. */
    changePassword: (input: { currentPassword: string; newPassword: string }) =>
      request<void>("/api/account/password", { method: "PATCH", ...json(input) }),
    removeAvatar: () => request<void>("/api/account/avatar", { method: "DELETE" }),
  },
  contact: {
    send: (input: { name: string; email: string; message: string }) =>
      request<{ sent: boolean }>("/api/contact", { method: "POST", ...json(input) }),
  },
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
  meditation: {
    overview: () => request<MeditationOverviewView>("/api/meditation"),
    /** Seeds the starter styles and presets for whichever list is empty; safe to repeat. */
    seedDefaults: () =>
      request<{ styles: MeditationStyleView[]; presets: MeditationPresetView[] }>("/api/meditation/defaults", { method: "POST" }),
    totals: (from: string, to: string) =>
      request<{ days: MeditationDay[] }>(`/api/meditation/totals?from=${from}&to=${to}`).then((r) => r.days),
    createSession: (input: CreateMeditationSessionInput) =>
      request<{ session: MeditationSessionView }>("/api/meditation/sessions", { method: "POST", ...json(input) }).then((r) => r.session),
    updateSession: (id: string, patch: UpdateMeditationSession) =>
      request<{ session: MeditationSessionView }>(`/api/meditation/sessions/${id}`, { method: "PATCH", ...json(patch) }).then((r) => r.session),
    removeSession: (id: string) => request<void>(`/api/meditation/sessions/${id}`, { method: "DELETE" }),
    createStyle: (input: MeditationStyleInput) =>
      request<{ style: MeditationStyleView }>("/api/meditation/styles", { method: "POST", ...json(input) }).then((r) => r.style),
    updateStyle: (id: string, input: MeditationStyleInput) =>
      request<{ style: MeditationStyleView }>(`/api/meditation/styles/${id}`, { method: "PATCH", ...json(input) }).then((r) => r.style),
    removeStyle: (id: string) => request<void>(`/api/meditation/styles/${id}`, { method: "DELETE" }),
    createPreset: (input: MeditationPresetInput) =>
      request<{ preset: MeditationPresetView }>("/api/meditation/presets", { method: "POST", ...json(input) }).then((r) => r.preset),
    updatePreset: (id: string, input: MeditationPresetInput) =>
      request<{ preset: MeditationPresetView }>(`/api/meditation/presets/${id}`, { method: "PATCH", ...json(input) }).then((r) => r.preset),
    removePreset: (id: string) => request<void>(`/api/meditation/presets/${id}`, { method: "DELETE" }),
    setTimer: (seconds: number) =>
      request<{ defaultTimerSeconds: number }>("/api/meditation/timer", { method: "PATCH", ...json({ seconds }) }).then((r) => r.defaultTimerSeconds),
    presence: {
      get: () => request<MeditatingNow>("/api/meditation/presence"),
      ping: () => request<void>("/api/meditation/presence", { method: "PUT" }),
      stop: () => request<void>("/api/meditation/presence", { method: "DELETE" }),
    },
  },
  feed: {
    list: () => request<{ items: FeedItemView[] }>("/api/feed").then((r) => r.items),
    /** Explicit rather than a toggle, so a retry cannot flip it twice. */
    react: (sessionId: string, reacted: boolean) =>
      request<{ reacted: boolean; reactionCount: number }>(`/api/feed/reactions/${sessionId}`, { method: "PUT", ...json({ reacted }) }),
  },
  notifications: {
    list: () => request<{ notifications: NotificationView[]; unread: number }>("/api/notifications"),
    markAllRead: () => request<{ unread: number }>("/api/notifications", { method: "PATCH", ...json({ read: true }) }).then((r) => r.unread),
    setRead: (id: string, read: boolean) =>
      request<{ notification: NotificationView }>(`/api/notifications/${id}`, { method: "PATCH", ...json({ read }) }).then((r) => r.notification),
    remove: (id: string) => request<void>(`/api/notifications/${id}`, { method: "DELETE" }),
  },
  workout: {
    /** The exercise library, recent workouts, and the named active workout with its sets. */
    overview: (active: string | null) =>
      request<WorkoutOverviewView>(`/api/workout${active ? `?active=${encodeURIComponent(active)}` : ""}`),
    start: (input: CreateWorkout) =>
      request<{ workout: WorkoutView }>("/api/workout/workouts", { method: "POST", ...json(input) }).then((r) => r.workout),
    finish: (id: string, patch: FinishWorkout) =>
      request<{ workout: WorkoutView }>(`/api/workout/workouts/${id}`, { method: "PATCH", ...json(patch) }).then((r) => r.workout),
    addSet: (workoutId: string, input: AddSet) =>
      request<{ set: WorkoutSetView; isPR: boolean }>(`/api/workout/workouts/${workoutId}/sets`, { method: "POST", ...json(input) }),
    removeSet: (id: string) => request<void>(`/api/workout/sets/${id}`, { method: "DELETE" }),
    totals: (from: string, to: string) =>
      request<{ days: WorkoutDay[] }>(`/api/workout/totals?from=${from}&to=${to}`).then((r) => r.days),
    records: () => request<{ records: PersonalRecordView[] }>("/api/workout/records").then((r) => r.records),
  },
  reminders: {
    list: () => request<{ reminders: ReminderView[] }>("/api/reminders").then((r) => r.reminders),
  },
  integrations: {
    list: () => request<{ connections: IntegrationConnectionView[]; ouraConfigured: boolean }>("/api/integrations"),
  },
  entertainment: {
    list: () => request<{ items: EntertainmentItemView[] }>("/api/entertainment").then((r) => r.items),
    create: (input: CreateEntertainmentInput) =>
      request<{ item: EntertainmentItemView }>("/api/entertainment", { method: "POST", ...json(input) }).then((r) => r.item),
    update: (id: string, patch: UpdateEntertainmentInput) =>
      request<{ item: EntertainmentItemView }>(`/api/entertainment/${id}`, { method: "PATCH", ...json(patch) }).then((r) => r.item),
    remove: (id: string) => request<void>(`/api/entertainment/${id}`, { method: "DELETE" }),
    totals: () => request<EntertainmentTotals>("/api/entertainment/totals"),
    watchedEpisodes: (series: string) =>
      request<{ episodes: ShowEpisodeView[] }>(`/api/entertainment/episodes?series=${encodeURIComponent(series)}`).then((r) => r.episodes),
    /** Idempotent: marking twice is one row, clearing answers `null`. */
    setEpisodeWatched: (input: EpisodeWatched) =>
      request<{ episode: ShowEpisodeView | null }>("/api/entertainment/episodes", { method: "PUT", ...json(input) }).then((r) => r.episode),
  },
  /** Every amount is integer cents (docs/API.md, Finances). */
  finances: {
    overview: () => request<FinanceOverviewView>("/api/finances"),
    accounts: {
      list: () => request<{ accounts: FinanceAccountView[] }>("/api/finances/accounts").then((r) => r.accounts),
      create: (input: CreateFinanceAccount) =>
        request<{ account: FinanceAccountView }>("/api/finances/accounts", { method: "POST", ...json(input) }).then((r) => r.account),
      update: (id: string, patch: UpdateFinanceAccount) =>
        request<{ account: FinanceAccountView }>(`/api/finances/accounts/${id}`, { method: "PATCH", ...json(patch) }).then((r) => r.account),
      /** Accounts are archived, never deleted. */
      archive: (id: string) => request<void>(`/api/finances/accounts/${id}`, { method: "DELETE" }),
    },
    categories: {
      list: () => request<{ categories: FinanceCategoryView[] }>("/api/finances/categories").then((r) => r.categories),
      create: (input: CreateFinanceCategory) =>
        request<{ category: FinanceCategoryView }>("/api/finances/categories", { method: "POST", ...json(input) }).then((r) => r.category),
    },
    transactions: {
      list: (limit: number) =>
        request<{ transactions: TransactionView[] }>(`/api/finances/transactions?limit=${limit}`).then((r) => r.transactions),
      create: (input: CreateTransactionInput) =>
        request<{ transaction: TransactionView }>("/api/finances/transactions", { method: "POST", ...json(input) }).then((r) => r.transaction),
      update: (id: string, patch: UpdateTransaction) =>
        request<{ transaction: TransactionView }>(`/api/finances/transactions/${id}`, { method: "PATCH", ...json(patch) }).then((r) => r.transaction),
      remove: (id: string) => request<void>(`/api/finances/transactions/${id}`, { method: "DELETE" }),
      /** Dollars in, as the CSV carries them; repeats are skipped by an import key. */
      import: (input: ImportTransactions) =>
        request<{ imported: number; skipped: number }>("/api/finances/transactions/import", { method: "POST", ...json(input) }),
    },
    month: (year: number, month: number) => request<MonthSummaryView>(`/api/finances/months/${year}/${month}`),
    budgets: {
      list: () => request<{ budgets: BudgetView[] }>("/api/finances/budgets").then((r) => r.budgets),
      /** Sets the one budget a category has. */
      set: (input: SetBudget) => request<{ budget: BudgetView }>("/api/finances/budgets", { method: "PUT", ...json(input) }).then((r) => r.budget),
      remove: (id: string) => request<void>(`/api/finances/budgets/${id}`, { method: "DELETE" }),
    },
    investments: {
      list: () => request<{ investments: InvestmentView[] }>("/api/finances/investments").then((r) => r.investments),
      create: (input: CreateInvestmentInput) =>
        request<{ investment: InvestmentView }>("/api/finances/investments", { method: "POST", ...json(input) }).then((r) => r.investment),
      update: (id: string, patch: UpdateInvestmentInput) =>
        request<{ investment: InvestmentView }>(`/api/finances/investments/${id}`, { method: "PATCH", ...json(patch) }).then((r) => r.investment),
      remove: (id: string) => request<void>(`/api/finances/investments/${id}`, { method: "DELETE" }),
    },
    properties: {
      list: () => request<{ properties: PropertyView[] }>("/api/finances/properties").then((r) => r.properties),
      create: (input: CreatePropertyInput) =>
        request<{ property: PropertyView }>("/api/finances/properties", { method: "POST", ...json(input) }).then((r) => r.property),
      update: (id: string, patch: UpdatePropertyInput) =>
        request<{ property: PropertyView }>(`/api/finances/properties/${id}`, { method: "PATCH", ...json(patch) }).then((r) => r.property),
      remove: (id: string) => request<void>(`/api/finances/properties/${id}`, { method: "DELETE" }),
    },
    retirement: {
      list: () => request<{ plans: RetirementPlanView[] }>("/api/finances/retirement").then((r) => r.plans),
      create: (input: CreateRetirementPlan) =>
        request<{ plan: RetirementPlanView }>("/api/finances/retirement", { method: "POST", ...json(input) }).then((r) => r.plan),
      update: (id: string, patch: UpdateRetirementPlan) =>
        request<{ plan: RetirementPlanView }>(`/api/finances/retirement/${id}`, { method: "PATCH", ...json(patch) }).then((r) => r.plan),
      remove: (id: string) => request<void>(`/api/finances/retirement/${id}`, { method: "DELETE" }),
    },
    netWorth: () => request<NetWorth>("/api/finances/net-worth"),
    snapshots: {
      list: (limit: number) => request<{ snapshots: SnapshotView[] }>(`/api/finances/snapshots?limit=${limit}`).then((r) => r.snapshots),
      take: () => request<{ snapshot: SnapshotView }>("/api/finances/snapshots", { method: "POST" }).then((r) => r.snapshot),
    },
  },
};

export type {
  Preferences,
  UpdatePreferences,
  CreateMetric,
  UpdateMetric,
  CreateEntry,
  UpdateEntry,
  CreateTrackingItem,
  UpdateTrackingItem,
  MedicalTotals,
  UpdateMeditationSession,
  MeditationStyleInput,
  MeditationPresetInput,
  MeditatingNow,
  CreateWorkout,
  FinishWorkout,
  AddSet,
  EpisodeWatched,
  EntertainmentTotals,
  CreateFinanceAccount,
  UpdateFinanceAccount,
  CreateFinanceCategory,
  UpdateTransaction,
  ImportTransactions,
  SetBudget,
  CreateRetirementPlan,
  UpdateRetirementPlan,
  NetWorth,
  SessionUser,
};

/** What to show a person when a call fails: the first field message, else the error, else a generic line. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const field = error.fields ? Object.values(error.fields)[0]?.[0] : undefined;
    return field ?? error.message;
  }
  return "Something went wrong. Please try again.";
}
