import { HttpError, type ApiError } from "@/server/api/_lib/http";

export type ActionResult = {
  success: boolean;
  error?: string;
};

/**
 * Runs shared API logic on behalf of a server action and turns its error
 * response into the `{ success, error }` the clients still read. Kept until
 * Phase 3 of the port moves the clients onto the endpoints themselves.
 */
export async function asResult(work: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await work();
    return { success: true };
  } catch (cause) {
    if (!(cause instanceof HttpError)) throw cause;
    const body = (await cause.response.json()) as ApiError;
    const detail = body.fields ? Object.values(body.fields)[0]?.[0] : undefined;
    return { success: false, error: detail ?? body.error };
  }
}
