import { nextRoute } from "@/server/api/_lib/context";
import * as finances from "@/server/api/finances";

export const POST = nextRoute(finances.transactionImport.POST);
