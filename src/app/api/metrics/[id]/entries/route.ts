import { nextRoute } from "@/server/api/_lib/context";
import * as metrics from "@/server/api/metrics";

export const POST = nextRoute(metrics.entries.POST);
