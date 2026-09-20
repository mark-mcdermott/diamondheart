import { nextRoute } from "@/server/api/_lib/context";
import * as preferences from "@/server/api/preferences";

export const GET = nextRoute(preferences.GET);
export const PATCH = nextRoute(preferences.PATCH);
