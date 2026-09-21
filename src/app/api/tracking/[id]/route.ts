import { nextRoute } from "@/server/api/_lib/context";
import * as tracking from "@/server/api/tracking";

export const PATCH = nextRoute(tracking.item.PATCH);
export const DELETE = nextRoute(tracking.item.DELETE);
