import { nextRoute } from "@/server/api/_lib/context";
import * as metrics from "@/server/api/metrics";

export const GET = nextRoute(metrics.item.GET);
export const PATCH = nextRoute(metrics.item.PATCH);
export const DELETE = nextRoute(metrics.item.DELETE);
