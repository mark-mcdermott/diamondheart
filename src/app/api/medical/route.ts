import { nextRoute } from "@/server/api/_lib/context";
import * as medical from "@/server/api/medical";

export const GET = nextRoute(medical.GET);
export const POST = nextRoute(medical.POST);
