import { nextRoute } from "@/server/api/_lib/context";
import * as appointments from "@/server/api/appointments";

export const PATCH = nextRoute(appointments.item.PATCH);
export const DELETE = nextRoute(appointments.item.DELETE);
