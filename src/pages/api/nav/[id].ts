import { astroRoute } from "@/server/api/_lib/context";
import * as nav from "@/server/api/nav";

export const prerender = false;

export const PATCH = astroRoute(nav.item.PATCH);
