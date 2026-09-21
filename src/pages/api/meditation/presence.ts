import { astroRoute } from "@/server/api/_lib/context";
import * as meditation from "@/server/api/meditation";

export const prerender = false;

export const GET = astroRoute(meditation.presence.GET);
export const PUT = astroRoute(meditation.presence.PUT);
export const DELETE = astroRoute(meditation.presence.DELETE);
