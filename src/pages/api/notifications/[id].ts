import { astroRoute } from "@/server/api/_lib/context";
import * as notifications from "@/server/api/notifications";

export const prerender = false;

export const PATCH = astroRoute(notifications.item.PATCH);
export const DELETE = astroRoute(notifications.item.DELETE);
