import { nextRoute } from "@/server/api/_lib/context";
import * as account from "@/server/api/account";

export const PATCH = nextRoute(account.password.PATCH);
