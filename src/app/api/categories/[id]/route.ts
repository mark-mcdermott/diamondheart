import { nextRoute } from "@/server/api/_lib/context";
import * as categories from "@/server/api/categories";

export const PATCH = nextRoute(categories.item.PATCH);
export const DELETE = nextRoute(categories.item.DELETE);
