import { astroRoute } from "@/server/api/_lib/context";
import * as categories from "@/server/api/categories";

export const prerender = false;

export const PATCH = astroRoute(categories.item.PATCH);
export const DELETE = astroRoute(categories.item.DELETE);
