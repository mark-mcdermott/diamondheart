import { z } from "zod";
import { db } from "@/db";
import { contactSubmissions } from "@/db/schema";
import type { ApiHandler } from "./_lib/context";
import { handler, json, readJson } from "./_lib/http";

export const contactSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    email: z.email("Enter a valid email address").max(320),
    message: z.string().trim().min(1, "Message is required").max(5000),
  })
  .strict();

/** The public contact form. Unauthenticated by design; it only writes a row. */
export const POST: ApiHandler = ({ request }) =>
  handler(async () => {
    const body = await readJson(request, contactSchema);
    await db.insert(contactSubmissions).values({ id: crypto.randomUUID(), name: body.name, email: body.email, message: body.message });
    return json({ sent: true }, 202);
  });
