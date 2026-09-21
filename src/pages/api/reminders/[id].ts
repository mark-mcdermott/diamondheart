import { astroRoute } from "@/server/api/_lib/context";
import * as reminders from "@/server/api/reminders";

export const prerender = false;

export const PATCH = astroRoute(reminders.item.PATCH);
export const DELETE = astroRoute(reminders.item.DELETE);
