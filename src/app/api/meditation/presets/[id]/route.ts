import { nextRoute } from "@/server/api/_lib/context";
import * as meditation from "@/server/api/meditation";

export const PATCH = nextRoute(meditation.preset.PATCH);
export const DELETE = nextRoute(meditation.preset.DELETE);
