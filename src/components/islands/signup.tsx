import { useState } from "react";
import { attempt, authClient } from "@/lib/auth-client";
import { CheckInbox } from "@/components/blocks/check-inbox";
import { SignupForm } from "@/components/blocks/signup-form";

const MIN_PASSWORD_LENGTH = 8;

/** The sign-up card, an island on an Astro page. */
export function Signup({ onLogin }: { onLogin?: () => void } = {}) {
  const [error, setError] = useState<string | undefined>();
  /** Set once the account exists; sign-up no longer signs anyone in. */
  const [pendingAddress, setPendingAddress] = useState<string | undefined>();

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
    /*
     * No redirect any more. `requireEmailVerification` means sign-up creates the account
     * without a session, so sending anyone to /dashboard would bounce them to login with
     * nothing explaining why. The native bundle is in the same position — there is no token
     * to store until the address is verified — so both land here.
     */
    setPendingAddress(email);
  }

  if (pendingAddress) return <CheckInbox email={pendingAddress} />;

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <SignupForm action={signUp} error={error} onLogin={onLogin} />
    </div>
  );
}
