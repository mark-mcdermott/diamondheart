import { astroRoute } from "@/server/api/_lib/context";
import * as categories from "@/server/api/categories";

export const prerender = false;

export const GET = astroRoute(categories.GET);
export const POST = astroRoute(categories.POST);
