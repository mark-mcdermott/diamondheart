import { nextRoute } from "@/server/api/_lib/context";
import * as medical from "@/server/api/medical";

export const GET = nextRoute(medical.totals.GET);
