import { astroRoute } from "@/server/api/_lib/context";
import * as integrations from "@/server/api/integrations";

export const prerender = false;

export const POST = astroRoute(integrations.healthkit.sync);
