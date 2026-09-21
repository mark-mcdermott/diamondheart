import { astroRoute } from "@/server/api/_lib/context";
import * as meditation from "@/server/api/meditation";

export const prerender = false;

export const GET = astroRoute(meditation.sessions.GET);
export const POST = astroRoute(meditation.sessions.POST);
