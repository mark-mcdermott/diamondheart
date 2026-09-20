import { nextRoute } from "@/server/api/_lib/context";
import * as nav from "@/server/api/nav";

export const GET = nextRoute(nav.GET);
export const PATCH = nextRoute(nav.PATCH);
