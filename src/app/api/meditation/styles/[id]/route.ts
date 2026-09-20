import { nextRoute } from "@/server/api/_lib/context";
import * as meditation from "@/server/api/meditation";

export const PATCH = nextRoute(meditation.style.PATCH);
export const DELETE = nextRoute(meditation.style.DELETE);
