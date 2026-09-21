import { nextRoute } from "@/server/api/_lib/context";
import * as finances from "@/server/api/finances";

export const GET = nextRoute(finances.retirement.GET);
export const POST = nextRoute(finances.retirement.POST);
