import { nextRoute } from "@/server/api/_lib/context";
import * as notifications from "@/server/api/notifications";

export const PATCH = nextRoute(notifications.item.PATCH);
export const DELETE = nextRoute(notifications.item.DELETE);
