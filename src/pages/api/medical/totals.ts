import { astroRoute } from "@/server/api/_lib/context";
import * as medical from "@/server/api/medical";

export const prerender = false;

export const GET = astroRoute(medical.totals.GET);
