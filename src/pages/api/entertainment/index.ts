import { astroRoute } from "@/server/api/_lib/context";
import * as entertainment from "@/server/api/entertainment";

export const prerender = false;

export const GET = astroRoute(entertainment.GET);
export const POST = astroRoute(entertainment.POST);
