"use client";

import { useActionState } from "react";
import { login, type AuthResult } from "@/app/actions/auth";
import { LoginForm } from "@/components/blocks/login-form";

const initialState: AuthResult = { success: false };

export default function LoginPage() {
  const [state, formAction] = useActionState(login, initialState);

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <LoginForm
        action={formAction}
        error={state.error}
      />
    </div>
  );
}
