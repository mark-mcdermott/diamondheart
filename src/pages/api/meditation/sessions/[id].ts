import { astroRoute } from "@/server/api/_lib/context";
import * as meditation from "@/server/api/meditation";

export const prerender = false;

export const PATCH = astroRoute(meditation.session.PATCH);
export const DELETE = astroRoute(meditation.session.DELETE);
