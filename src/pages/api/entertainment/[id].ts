import { astroRoute } from "@/server/api/_lib/context";
import * as entertainment from "@/server/api/entertainment";

export const prerender = false;

export const PATCH = astroRoute(entertainment.item.PATCH);
export const DELETE = astroRoute(entertainment.item.DELETE);
