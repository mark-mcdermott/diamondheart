import type { APIRoute } from "astro";
/**
 * The handler shape every resource in `src/server/api/` exports.
 *
 * Framework-agnostic on purpose (`docs/PORT-PLAN.md`, Decision 1): a handler
 * takes a Web `Request` and the route's params and returns a Web `Response`.
 * Next mounts it through `nextRoute()` below; the Astro `APIRoute` adapter in
 * Phase 4 is the same three lines against `context.request` and `context.params`.
 */
export interface ApiContext {
  request: Request;
  params: Record<string, string>;
}

export type ApiHandler = (context: ApiContext) => Promise<Response>;

/** Adapts a handler to Next's route-module signature, where `params` is a promise. */
/**
 * Mounts a handler as an Astro endpoint. Astro hands params as
 * `Record<string, string | undefined>`; a rest segment that matched nothing is
 * dropped rather than passed as the string "undefined".
 */
export function astroRoute(handler: ApiHandler): APIRoute {
  return ({ request, params }) =>
    handler({
      request,
      params: Object.fromEntries(Object.entries(params).filter((entry): entry is [string, string] => typeof entry[1] === "string")),
    });
}
