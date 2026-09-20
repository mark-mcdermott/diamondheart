import { nextRoute } from "@/server/api/_lib/context";
import * as feed from "@/server/api/feed";

export const GET = nextRoute(feed.GET);
