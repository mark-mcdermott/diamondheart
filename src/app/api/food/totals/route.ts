import { nextRoute } from "@/server/api/_lib/context";
import * as food from "@/server/api/food";

export const GET = nextRoute(food.totals.GET);
