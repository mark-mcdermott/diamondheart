import type { ZodType, ZodIssue } from "zod";

/** One error shape for the whole API, so the applet has one thing to handle. */
export interface ApiError {
  error: string;
  /** Field-keyed validation messages, present only on a 422. */
  fields?: Record<string, string[]>;
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}

export function fail(status: number, error: string, fields?: Record<string, string[]>): Response {
  const body: ApiError = fields ? { error, fields } : { error };
  return json(body, status);
}

export const unauthorized = () => fail(401, "Not signed in");
export const forbidden = () => fail(403, "Forbidden");
export const notFound = (what = "Not found") => fail(404, what);

/**
 * Thrown by a handler to unwind to a specific response. Handlers stay linear:
 * `const { userId } = await requireSession(request)` reads as a value, not a branch.
 */
export class HttpError extends Error {
  constructor(readonly response: Response) {
    super("HttpError");
  }
}

/**
 * Wraps a handler so an `HttpError` becomes its response and anything else
 * becomes a 500 with the detail logged rather than returned. An unexpected
 * throw from the database driver can carry the connection string.
 */
export function handler(fn: () => Promise<Response>): Promise<Response> {
  return fn().catch((cause: unknown) => {
    if (cause instanceof HttpError) return cause.response;
    console.error("Unhandled API error:", cause);
    return fail(500, "Something went wrong");
  });
}

function fieldErrors(issues: ZodIssue[]): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "_";
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}

/** Parses and validates a JSON body, unwinding to a 400 or a 422 listing the bad fields. */
export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new HttpError(fail(400, "Body must be JSON"));
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new HttpError(fail(422, "Validation failed", fieldErrors(parsed.error.issues)));
  }
  return parsed.data;
}
