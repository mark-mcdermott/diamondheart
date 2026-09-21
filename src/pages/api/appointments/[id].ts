import { astroRoute } from "@/server/api/_lib/context";
import * as appointments from "@/server/api/appointments";

export const prerender = false;

export const PATCH = astroRoute(appointments.item.PATCH);
export const DELETE = astroRoute(appointments.item.DELETE);
