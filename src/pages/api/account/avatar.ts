import { astroRoute } from "@/server/api/_lib/context";
import * as account from "@/server/api/account";

export const prerender = false;

export const DELETE = astroRoute(account.avatar.DELETE);
