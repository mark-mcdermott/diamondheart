import { nextRoute } from "@/server/api/_lib/context";
import * as account from "@/server/api/account";

export const DELETE = nextRoute(account.avatar.DELETE);
