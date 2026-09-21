import { z } from "zod";
import { db } from "@/db";
import { contactSubmissions } from "@/db/schema";
import type { ApiHandler } from "./_lib/context";
import { fail, handler, json, readJson } from "./_lib/http";
import { clientKey, createRateLimiter } from "./_lib/rate-limit";

export const contactSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    email: z.email("Enter a valid email address").max(320),
    message: z.string().trim().min(1, "Message is required").max(5000),
  })
  .strict();

const MESSAGES_PER_WINDOW = 5;
const WINDOW_MS = 10 * 60 * 1000;
const limiter = createRateLimiter({ limit: MESSAGES_PER_WINDOW, windowMs: WINDOW_MS });

/** The public contact form. Unauthenticated by design; it only writes a row, so the limiter is what keeps that row count honest. */
export const POST: ApiHandler = ({ request }) =>
  handler(async () => {
    if (!limiter.take(clientKey(request))) return fail(429, "Too many messages from this address; try again later");
    const body = await readJson(request, contactSchema);
    await db.insert(contactSubmissions).values({ id: crypto.randomUUID(), name: body.name, email: body.email, message: body.message });
    return json({ sent: true }, 202);
  });
