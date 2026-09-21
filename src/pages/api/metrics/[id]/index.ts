import { astroRoute } from "@/server/api/_lib/context";
import * as metrics from "@/server/api/metrics";

export const prerender = false;

export const GET = astroRoute(metrics.item.GET);
export const PATCH = astroRoute(metrics.item.PATCH);
export const DELETE = astroRoute(metrics.item.DELETE);
