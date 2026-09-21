import { nextRoute } from "@/server/api/_lib/context";
import * as finances from "@/server/api/finances";

export const DELETE = nextRoute(finances.budget.DELETE);
