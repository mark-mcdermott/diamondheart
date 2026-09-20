import { nextRoute } from "@/server/api/_lib/context";
import * as notifications from "@/server/api/notifications";

export const GET = nextRoute(notifications.GET);
export const PATCH = nextRoute(notifications.PATCH);
