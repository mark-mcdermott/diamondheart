import { astroRoute } from "@/server/api/_lib/context";
import * as finances from "@/server/api/finances";

export const prerender = false;

export const PATCH = astroRoute(finances.investment.PATCH);
export const DELETE = astroRoute(finances.investment.DELETE);
