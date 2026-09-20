import { nextRoute } from "@/server/api/_lib/context";
import * as meditation from "@/server/api/meditation";

export const PATCH = nextRoute(meditation.session.PATCH);
export const DELETE = nextRoute(meditation.session.DELETE);
