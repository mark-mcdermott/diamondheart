import { astroRoute } from "@/server/api/_lib/context";
import * as finances from "@/server/api/finances";

export const prerender = false;

export const GET = astroRoute(finances.snapshots.GET);
export const POST = astroRoute(finances.snapshots.POST);
