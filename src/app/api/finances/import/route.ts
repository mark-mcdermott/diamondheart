import { nextRoute } from "@/server/api/_lib/context";
import * as finances from "@/server/api/finances";

/** The import endpoint's original address, kept for any pipeline that posts here; the handler is the same. */
export const POST = nextRoute(finances.transactionImport.POST);
