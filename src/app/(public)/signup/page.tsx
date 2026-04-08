"use client";

import { useActionState } from "react";
import { signup, type AuthResult } from "@/app/actions/auth";
import { SignupForm } from "@/components/blocks/signup-form";

const initialState: AuthResult = { success: false };

export default function SignupPage() {
  const [state, formAction] = useActionState(signup, initialState);

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <SignupForm
        action={formAction}
        error={state.error}
      />
    </div>
  );
}
