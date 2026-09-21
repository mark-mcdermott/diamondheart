import { astroRoute } from "@/server/api/_lib/context";
import * as preferences from "@/server/api/preferences";

export const prerender = false;

export const GET = astroRoute(preferences.GET);
export const PATCH = astroRoute(preferences.PATCH);
