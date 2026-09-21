import { astroRoute } from "@/server/api/_lib/context";
import * as meditation from "@/server/api/meditation";

export const prerender = false;

export const PATCH = astroRoute(meditation.preset.PATCH);
export const DELETE = astroRoute(meditation.preset.DELETE);
