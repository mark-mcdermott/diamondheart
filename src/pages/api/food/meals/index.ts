import { astroRoute } from "@/server/api/_lib/context";
import * as food from "@/server/api/food";

export const prerender = false;

export const GET = astroRoute(food.meals.GET);
export const POST = astroRoute(food.meals.POST);
