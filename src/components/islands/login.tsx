import { useState } from "react";
import { NATIVE } from "@/app/platform";
import { EMAIL_NOT_VERIFIED, attemptDetailed, authClient, safeRedirect } from "@/lib/auth-client";
import { CheckInbox } from "@/components/blocks/check-inbox";
import { LoginForm } from "@/components/blocks/login-form";

/** The sign-in card, an island on an Astro page: a successful sign-in is a full load into the applet. */
export function Login({ onSignup }: { onSignup?: () => void } = {}) {
  const [error, setError] = useState<string | undefined>();
  /** Set when the account exists but its address is unverified — a different problem to a bad password. */
  const [unverified, setUnverified] = useState<string | undefined>();

  async function signIn(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    setError(undefined);
    const failure = await attemptDetailed(
      () => authClient.signIn.email({ email, password }),
      "Invalid email or password",
    );
    if (failure) {
      /*
       * Refused for the one reason the sign-in form cannot help with. Showing "invalid email
       * or password" here would be a lie that sends somebody to reset a password that is
       * already correct.
       */
      if (failure.code === EMAIL_NOT_VERIFIED) {
        setUnverified(email);
        return;
      }
      setError(failure.message);
      return;
    }
    if (NATIVE) {
      // The token is stored; a reload takes the bundle from its sign-in screen into the applet.
      window.location.reload();
      return;
    }
    window.location.assign(safeRedirect(new URLSearchParams(window.location.search).get("redirect")));
  }

  if (unverified) return <CheckInbox email={unverified} title="Verify your email first" />;

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <LoginForm action={signIn} error={error} onSignup={onSignup} />
    </div>
  );
}
