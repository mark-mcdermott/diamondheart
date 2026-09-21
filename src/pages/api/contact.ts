import { astroRoute } from "@/server/api/_lib/context";
import * as contact from "@/server/api/contact";

export const prerender = false;

export const POST = astroRoute(contact.POST);
