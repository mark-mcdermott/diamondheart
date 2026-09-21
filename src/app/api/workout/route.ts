import { nextRoute } from "@/server/api/_lib/context";
import * as workout from "@/server/api/workout";

export const GET = nextRoute(workout.GET);
