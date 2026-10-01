import { astroRoute } from "@/server/api/_lib/context";
import * as push from "@/server/api/push";

export const prerender = false;

export const POST = astroRoute(push.test.POST);
