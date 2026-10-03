import { useState } from "react";
import { NATIVE } from "@/app/platform";
import { attempt, authClient, safeRedirect } from "@/lib/auth-client";
import { LoginForm } from "@/components/blocks/login-form";

/** The sign-in card, an island on an Astro page: a successful sign-in is a full load into the applet. */
export function Login({ onSignup }: { onSignup?: () => void } = {}) {
  const [error, setError] = useState<string | undefined>();

  async function signIn(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    setError(undefined);
    const failure = await attempt(() => authClient.signIn.email({ email, password }), "Invalid email or password");
    if (failure) {
      setError(failure);
      return;
    }
    if (NATIVE) {
      // The token is stored; a reload takes the bundle from its sign-in screen into the applet.
      window.location.reload();
      return;
    }
    window.location.assign(safeRedirect(new URLSearchParams(window.location.search).get("redirect")));
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <LoginForm action={signIn} error={error} onSignup={onSignup} />
    </div>
  );
}
