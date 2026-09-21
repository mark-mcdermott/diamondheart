import { astroRoute } from "@/server/api/_lib/context";
import * as tracking from "@/server/api/tracking";

export const prerender = false;

export const POST = astroRoute(tracking.count.POST);
