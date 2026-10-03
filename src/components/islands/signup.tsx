import { useState } from "react";
import { NATIVE } from "@/app/platform";
import { attempt, authClient } from "@/lib/auth-client";
import { SignupForm } from "@/components/blocks/signup-form";

const MIN_PASSWORD_LENGTH = 8;

/** The sign-up card, an island on an Astro page. */
export function Signup({ onLogin }: { onLogin?: () => void } = {}) {
  const [error, setError] = useState<string | undefined>();

  async function signUp(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    setError(undefined);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const failure = await attempt(
      () =>
        authClient.signUp.email({
          // Better Auth requires a name; the form does not. The address's local part is the honest default.
          name: name || email.split("@")[0],
          email,
          password,
        }),
      "Could not create the account",
    );
    if (failure) {
      setError(failure);
      return;
    }
    if (NATIVE) {
      // The token is stored; a reload takes the bundle from its sign-in screen into the applet.
      window.location.reload();
      return;
    }
    window.location.assign("/dashboard");
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <SignupForm action={signUp} error={error} onLogin={onLogin} />
    </div>
  );
}
