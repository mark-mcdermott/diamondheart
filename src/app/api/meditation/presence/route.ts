import { nextRoute } from "@/server/api/_lib/context";
import * as meditation from "@/server/api/meditation";

export const GET = nextRoute(meditation.presence.GET);
export const PUT = nextRoute(meditation.presence.PUT);
export const DELETE = nextRoute(meditation.presence.DELETE);
