import type { UpdatePreferences } from "@/server/api/_lib/schemas";
import type { Preferences } from "@/server/api/preferences";

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

export const keys = {
  preferences: ["preferences"] as const,
  nav: ["nav"] as const,
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
  },
};

export type { Preferences, UpdatePreferences };

/** What to show a person when a call fails: the first field message, else the error, else a generic line. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const field = error.fields ? Object.values(error.fields)[0]?.[0] : undefined;
    return field ?? error.message;
  }
  return "Something went wrong. Please try again.";
}
