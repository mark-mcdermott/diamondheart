import { nextRoute } from "@/server/api/_lib/context";
import * as food from "@/server/api/food";

export const GET = nextRoute(food.favorites.GET);
export const POST = nextRoute(food.favorites.POST);
