import { nextRoute } from "@/server/api/_lib/context";
import * as entertainment from "@/server/api/entertainment";

export const GET = nextRoute(entertainment.GET);
export const POST = nextRoute(entertainment.POST);
