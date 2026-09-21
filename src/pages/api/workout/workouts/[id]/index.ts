import { astroRoute } from "@/server/api/_lib/context";
import * as workout from "@/server/api/workout";

export const prerender = false;

export const PATCH = astroRoute(workout.workout.PATCH);
