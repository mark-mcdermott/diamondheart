import { astroRoute } from "@/server/api/_lib/context";
import * as meditation from "@/server/api/meditation";

export const prerender = false;

export const POST = astroRoute(meditation.defaults.POST);
