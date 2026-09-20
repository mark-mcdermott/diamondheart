import { toast } from "sonner";

export type ActionResultLike = { success: boolean; error?: string };

/**
 * Surfaces a server action's failure to the user.
 *
 * 77 actions in this codebase return `{ success, error }`. Almost none of those
 * strings could ever reach a human: the toast library was installed, wrapped and
 * never mounted, so every call site independently did the only thing available —
 * nothing. A delete that failed looked exactly like a delete that worked.
 *
 *     await surfaceErrors(deleteMetric(fd));
 *
 * The result is returned, so callers that branch on success still can.
 *
 * Only *returned* failures are handled. An action that throws is not caught
 * here, deliberately: `redirect()` works by throwing, and swallowing that would
 * break every redirecting action.
 */
export async function surfaceErrors<T extends ActionResultLike>(
  action: Promise<T>,
  fallback = "Something went wrong. Please try again."
): Promise<T> {
  const result = await action;
  if (!result?.success) {
    toast.error(result?.error?.trim() || fallback);
  }
  return result;
}
