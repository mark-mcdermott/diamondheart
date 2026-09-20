import { nextRoute } from "@/server/api/_lib/context";
import * as finances from "@/server/api/finances";

export const PATCH = nextRoute(finances.retirementPlan.PATCH);
export const DELETE = nextRoute(finances.retirementPlan.DELETE);
