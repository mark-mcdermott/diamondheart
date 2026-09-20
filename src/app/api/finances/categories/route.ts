import { nextRoute } from "@/server/api/_lib/context";
import * as finances from "@/server/api/finances";

export const GET = nextRoute(finances.categories.GET);
export const POST = nextRoute(finances.categories.POST);
