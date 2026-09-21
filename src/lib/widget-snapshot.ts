import { z } from "zod";
import { apiFetch } from "@/app/api";

export const widgetSnapshotSchema = z.object({
  current: z.number().int().nonnegative(),
  todayCompleted: z.number().int().nonnegative(),
  todayTotal: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export type WidgetSnapshot = z.infer<typeof widgetSnapshotSchema>;

export async function fetchWidgetSnapshot(
  fetcher: (path: string, init?: RequestInit) => Promise<Response> = apiFetch
): Promise<WidgetSnapshot | null> {
  try {
    const res = await fetcher("/api/widget/snapshot", {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const parsed = widgetSnapshotSchema.safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
