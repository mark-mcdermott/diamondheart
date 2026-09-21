import { astroRoute } from "@/server/api/_lib/context";
import * as food from "@/server/api/food";

export const prerender = false;

export const DELETE = astroRoute(food.logItem.DELETE);
