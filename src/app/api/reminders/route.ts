import { nextRoute } from "@/server/api/_lib/context";
import * as reminders from "@/server/api/reminders";

export const GET = nextRoute(reminders.GET);
export const POST = nextRoute(reminders.POST);
