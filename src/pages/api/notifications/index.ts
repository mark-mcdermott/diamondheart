import { astroRoute } from "@/server/api/_lib/context";
import * as notifications from "@/server/api/notifications";

export const prerender = false;

export const GET = astroRoute(notifications.GET);
export const PATCH = astroRoute(notifications.PATCH);
