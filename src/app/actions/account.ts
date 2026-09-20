"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { HttpError, type ApiError } from "@/server/api/_lib/http";
import * as account from "@/server/api/account";

/** Thin wrappers over `src/server/api/account.ts`, kept until Phase 3 moves the account block onto `/api/account/*`. */

const changePasswordForm = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type AccountResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function changePassword(_prevState: AccountResult, formData: FormData): Promise<AccountResult> {
  const session = await getCurrentUser();
  if (!session) return { success: false, error: "Not authenticated" };

  const parsed = changePasswordForm.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { success: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    await account.changePassword(await headers(), parsed.data.currentPassword, parsed.data.newPassword);
    return { success: true };
  } catch (cause) {
    if (!(cause instanceof HttpError)) throw cause;
    const body = (await cause.response.json()) as ApiError;
    return body.fields ? { success: false, fieldErrors: body.fields } : { success: false, error: body.error };
  }
}

export async function removeAvatar(): Promise<{ error?: string }> {
  const session = await getCurrentUser();
  if (!session) return { error: "Not authenticated" };

  try {
    await account.removeAvatar(session.userId);
    return {};
  } catch (cause) {
    if (!(cause instanceof HttpError)) throw cause;
    return { error: ((await cause.response.json()) as ApiError).error };
  }
}
