import { astroRoute } from "@/server/api/_lib/context";
import * as metrics from "@/server/api/metrics";

export const prerender = false;

export const GET = astroRoute(metrics.GET);
export const POST = astroRoute(metrics.POST);
export const PATCH = astroRoute(metrics.PATCH);
