import { useState } from "react";
import { attemptWith, authClient } from "@/lib/auth-client";
import { NATIVE } from "@/app/platform";
import { CheckInbox } from "@/components/blocks/check-inbox";
import { SignupForm } from "@/components/blocks/signup-form";

const MIN_PASSWORD_LENGTH = 8;

/** The sign-up card, an island on an Astro page. */
export function Signup({ onLogin }: { onLogin?: () => void } = {}) {
  const [error, setError] = useState<string | undefined>();
  /** Set when sign-up made the account but opened no session — the verification gate's answer. */
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

    const outcome = await attemptWith(
      () =>
        authClient.signUp.email({
          // Better Auth requires a name; the form does not. The address's local part is the honest default.
          name: name || email.split("@")[0],
          email,
          password,
        }),
      "Could not create the account",
    );
    if (outcome.failure) {
      setError(outcome.failure.message);
      return;
    }
    /*
     * Whether sign-up opened a session is the server's call, and the answer is in the body.
     * With `requireEmailVerification` on, Better Auth creates the account and answers
     * `token: null`: nothing to store, nothing to redirect into, and /dashboard would bounce
     * to login with nothing explaining why. That lands on the inbox screen. With the gate
     * off — the e2e server, or a deployment that opts out — a session comes back and the
     * account is already signed in, so the redirect is the right one. Reading `token` keeps
     * this form honest about which world it is in rather than assuming the first.
     */
    if (!outcome.data.token) {
      setPendingAddress(email);
      return;
    }
    if (NATIVE) {
      // The token is stored; a reload takes the bundle from its sign-in screen into the applet.
      window.location.reload();
      return;
    }
    window.location.assign("/dashboard");
  }

  if (pendingAddress) return <CheckInbox email={pendingAddress} />;

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <SignupForm action={signUp} error={error} onLogin={onLogin} />
    </div>
  );
}
