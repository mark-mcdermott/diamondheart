import { nextRoute } from "@/server/api/_lib/context";
import * as tracking from "@/server/api/tracking";

export const POST = nextRoute(tracking.count.POST);
