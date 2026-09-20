import { nextRoute } from "@/server/api/_lib/context";
import * as entertainment from "@/server/api/entertainment";

export const PATCH = nextRoute(entertainment.item.PATCH);
export const DELETE = nextRoute(entertainment.item.DELETE);
