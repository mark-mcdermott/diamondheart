import { astroRoute } from "@/server/api/_lib/context";
import * as tracking from "@/server/api/tracking";

export const prerender = false;

export const PATCH = astroRoute(tracking.item.PATCH);
export const DELETE = astroRoute(tracking.item.DELETE);
