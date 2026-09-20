import { nextRoute } from "@/server/api/_lib/context";
import * as meditation from "@/server/api/meditation";

export const GET = nextRoute(meditation.styles.GET);
export const POST = nextRoute(meditation.styles.POST);
