import { nextRoute } from "@/server/api/_lib/context";
import * as finances from "@/server/api/finances";

export const PATCH = nextRoute(finances.investment.PATCH);
export const DELETE = nextRoute(finances.investment.DELETE);
