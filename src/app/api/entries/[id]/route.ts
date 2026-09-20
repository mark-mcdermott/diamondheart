import { nextRoute } from "@/server/api/_lib/context";
import * as metrics from "@/server/api/metrics";

export const PATCH = nextRoute(metrics.entry.PATCH);
export const DELETE = nextRoute(metrics.entry.DELETE);
