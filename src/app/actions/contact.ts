"use server";

import { db } from "@/db";
import { contactSubmissions } from "@/db/schema";
import { revalidatePath } from "next/cache";

export type ContactResult = {
  success: boolean;
  error?: string;
};

export async function submitContact(formData: FormData): Promise<ContactResult> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const message = formData.get("message") as string;

  if (!name || !email || !message) {
    return { success: false, error: "All fields are required" };
  }

  await db.insert(contactSubmissions).values({
    id: crypto.randomUUID(),
    name,
    email,
    message,
  });

  revalidatePath("/contact");
  return { success: true };
}
