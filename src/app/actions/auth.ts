"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/server/auth";

/**
 * Sign-in, sign-up and sign-out over Better Auth's server API. The forms are
 * unchanged: they still post here through `useActionState`, and the
 * `nextCookies` plugin sets the session cookie on the way out. Phase 3 moves
 * the forms onto the Better Auth client and these go away.
 */

export type AuthResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z.object({
  name: z.string().trim().optional(),
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

function fieldErrors(error: z.ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}

/** Better Auth's error for a bad request, as the form's error line. */
function messageOf(cause: unknown, fallback: string): string {
  if (cause instanceof APIError) return cause.message || fallback;
  throw cause;
}

export async function login(_prevState: AuthResult, formData: FormData): Promise<AuthResult> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { success: false, fieldErrors: fieldErrors(parsed.error) };

  try {
    await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
  } catch (cause) {
    return { success: false, error: messageOf(cause, "Invalid email or password") };
  }
  redirect("/dashboard");
}

export async function signup(_prevState: AuthResult, formData: FormData): Promise<AuthResult> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name") || undefined,
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { success: false, fieldErrors: fieldErrors(parsed.error) };

  const { name, email, password } = parsed.data;
  try {
    await auth.api.signUpEmail({
      // Better Auth requires a name; the form does not. The address's local part is the honest default.
      body: { name: name || email.split("@")[0], email, password },
      headers: await headers(),
    });
  } catch (cause) {
    return { success: false, error: messageOf(cause, "Could not create the account") };
  }
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
