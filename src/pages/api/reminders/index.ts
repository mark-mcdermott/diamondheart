import { astroRoute } from "@/server/api/_lib/context";
import * as reminders from "@/server/api/reminders";

export const prerender = false;

export const GET = astroRoute(reminders.GET);
export const POST = astroRoute(reminders.POST);
