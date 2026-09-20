import { nextRoute } from "@/server/api/_lib/context";
import * as meditation from "@/server/api/meditation";

export const GET = nextRoute(meditation.presets.GET);
export const POST = nextRoute(meditation.presets.POST);
