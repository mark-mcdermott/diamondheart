import { astroRoute } from "@/server/api/_lib/context";
import * as meditation from "@/server/api/meditation";

export const prerender = false;

export const GET = astroRoute(meditation.presets.GET);
export const POST = astroRoute(meditation.presets.POST);
