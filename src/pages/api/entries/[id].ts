import { astroRoute } from "@/server/api/_lib/context";
import * as metrics from "@/server/api/metrics";

export const prerender = false;

export const PATCH = astroRoute(metrics.entry.PATCH);
export const DELETE = astroRoute(metrics.entry.DELETE);
