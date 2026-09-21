import { nextRoute } from "@/server/api/_lib/context";
import * as finances from "@/server/api/finances";

export const GET = nextRoute(finances.transactions.GET);
export const POST = nextRoute(finances.transactions.POST);
