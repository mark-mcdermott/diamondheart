"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient, safeRedirect } from "@/lib/auth-client";
import { LoginForm } from "@/components/blocks/login-form";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  async function signIn(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    setError(undefined);
    setPending(true);
    const { error: failure } = await authClient.signIn.email({ email, password });
    setPending(false);
    if (failure) {
      setError(failure.message || "Invalid email or password");
      return;
    }
    // The layout still renders the session on the server, so a refresh goes with the navigation.
    router.push(safeRedirect(searchParams.get("redirect")));
    router.refresh();
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <LoginForm action={signIn} error={error} pending={pending} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
