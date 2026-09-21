import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { SignupForm } from "@/components/blocks/signup-form";

const MIN_PASSWORD_LENGTH = 8;

/** The sign-up card, an island on an Astro page. */
export function Signup() {
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

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

    setPending(true);
    const { error: failure } = await authClient.signUp.email({
      // Better Auth requires a name; the form does not. The address's local part is the honest default.
      name: name || email.split("@")[0],
      email,
      password,
    });
    if (failure) {
      setPending(false);
      setError(failure.message || "Could not create the account");
      return;
    }
    window.location.assign("/dashboard");
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <SignupForm action={signUp} error={error} pending={pending} />
    </div>
  );
}
