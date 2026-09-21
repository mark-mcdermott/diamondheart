import { astroRoute } from "@/server/api/_lib/context";
import * as feed from "@/server/api/feed";

export const prerender = false;

export const PUT = astroRoute(feed.reaction.PUT);
