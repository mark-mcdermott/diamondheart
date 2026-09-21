import { astroRoute } from "@/server/api/_lib/context";
import * as appointments from "@/server/api/appointments";

export const prerender = false;

export const GET = astroRoute(appointments.GET);
export const POST = astroRoute(appointments.POST);
