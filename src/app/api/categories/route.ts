import { nextRoute } from "@/server/api/_lib/context";
import * as categories from "@/server/api/categories";

export const GET = nextRoute(categories.GET);
export const POST = nextRoute(categories.POST);
