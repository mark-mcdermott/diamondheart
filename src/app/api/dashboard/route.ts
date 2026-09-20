import { nextRoute } from "@/server/api/_lib/context";
import * as dashboard from "@/server/api/dashboard";

export const GET = nextRoute(dashboard.GET);
