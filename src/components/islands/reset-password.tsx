import { useState } from "react";
import { Link } from "@/app/link";
import { attempt, authClient } from "@/lib/auth-client";
import { SubmitButton } from "@/components/blocks/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MIN_PASSWORD_LENGTH = 8;

/**
 * Consumes the token from the emailed link and sets a new password.
 *
 * The token is read at submit rather than on mount so a missing one is reported when the
 * person acts, not as an error card they never asked for.
 */
export function ResetPassword() {
  const [error, setError] = useState<string | undefined>();
  const [done, setDone] = useState(false);

  async function reset(formData: FormData) {
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

    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setError("This link is missing its token. Request a new reset email.");
      return;
    }

    const failure = await attempt(
      () => authClient.resetPassword({ newPassword: password, token }),
      "Could not reset the password — the link may have expired",
    );
    if (failure) {
      setError(failure);
      return;
    }
    setDone(true);
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="mx-auto max-w-sm w-full">
        <div className="flex justify-center mb-8">
          <img src="/logo.png" alt="Diamondheart" className="h-16 w-16 object-contain" />
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Choose a new password</CardTitle>
            <CardDescription>
              {done ? "Your password has been changed." : "At least 8 characters."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <p className="text-sm text-muted-foreground text-center">
                <Link href="/login">Sign in</Link>
              </p>
            ) : (
              <form action={reset} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="password">New password</Label>
                  <Input id="password" name="password" type="password" autoComplete="new-password" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirm new password</Label>
                  <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
                </div>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <SubmitButton pendingLabel="Changing…">Change password</SubmitButton>
                <p className="text-sm text-muted-foreground text-center">
                  <Link href="/forgot-password">Request a new link</Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
