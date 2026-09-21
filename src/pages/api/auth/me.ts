import { astroRoute } from "@/server/api/_lib/context";
import * as auth from "@/server/api/auth";

export const prerender = false;

export const GET = astroRoute(auth.GET);
