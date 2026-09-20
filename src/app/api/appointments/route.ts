import { nextRoute } from "@/server/api/_lib/context";
import * as appointments from "@/server/api/appointments";

export const GET = nextRoute(appointments.GET);
export const POST = nextRoute(appointments.POST);
