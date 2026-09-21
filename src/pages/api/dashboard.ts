import { astroRoute } from "@/server/api/_lib/context";
import * as dashboard from "@/server/api/dashboard";

export const prerender = false;

export const GET = astroRoute(dashboard.GET);
