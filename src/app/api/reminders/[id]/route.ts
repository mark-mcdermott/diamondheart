import { nextRoute } from "@/server/api/_lib/context";
import * as reminders from "@/server/api/reminders";

export const PATCH = nextRoute(reminders.item.PATCH);
export const DELETE = nextRoute(reminders.item.DELETE);
