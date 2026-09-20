import { nextRoute } from "@/server/api/_lib/context";
import * as auth from "@/server/api/auth";

export const GET = nextRoute(auth.GET);
