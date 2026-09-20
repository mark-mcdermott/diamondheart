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
export function nextRoute(handler: ApiHandler) {
  return async (
    request: Request,
    context: { params: Promise<Record<string, string>> }
  ): Promise<Response> => handler({ request, params: await context.params });
}
