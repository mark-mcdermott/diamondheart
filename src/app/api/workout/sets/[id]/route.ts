import { nextRoute } from "@/server/api/_lib/context";
import * as workout from "@/server/api/workout";

export const DELETE = nextRoute(workout.set.DELETE);
