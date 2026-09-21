import { astroRoute } from "@/server/api/_lib/context";
import * as finances from "@/server/api/finances";

export const prerender = false;

export const GET = astroRoute(finances.budgets.GET);
export const PUT = astroRoute(finances.budgets.PUT);
