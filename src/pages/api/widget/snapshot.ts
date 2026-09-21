import type { APIRoute } from "astro";
import { resolveSession } from "@/server/api/_lib/session";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const session = await resolveSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: replace placeholder with real streak + today-progress computation.
  // Consumed by src/lib/widget-sync.ts, which forwards to the iOS Capacitor
  // plugin so the home-screen widget and watch complication stay fresh.
  return Response.json({
    current: 0,
    todayCompleted: 0,
    todayTotal: 0,
    updatedAt: Date.now(),
  });
};
