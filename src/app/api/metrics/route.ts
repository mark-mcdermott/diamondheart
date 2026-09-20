import { nextRoute } from "@/server/api/_lib/context";
import * as metrics from "@/server/api/metrics";

export const GET = nextRoute(metrics.GET);
export const POST = nextRoute(metrics.POST);
export const PATCH = nextRoute(metrics.PATCH);
