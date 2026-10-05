import { useState } from "react";
import { Link } from "@/app/link";
import { attempt, authClient } from "@/lib/auth-client";
import { SubmitButton } from "@/components/blocks/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Asks Better Auth to mail a reset link.
 *
 * The success message is deliberately the same whether or not the address has an account:
 * telling a stranger which addresses are registered is an account-enumeration leak, and this
 * form is public.
 */
export function ForgotPassword() {
  const [error, setError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);

  async function request(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();
    setError(undefined);
    const failure = await attempt(
      () => authClient.requestPasswordReset({ email, redirectTo: "/reset-password" }),
      "Could not send the reset email",
    );
    if (failure) {
      setError(failure);
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="mx-auto max-w-sm w-full">
        <div className="flex justify-center mb-8">
          <img src="/logo.png" alt="Diamondheart" className="h-16 w-16 object-contain" />
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Reset your password</CardTitle>
            <CardDescription>
              {sent
                ? "If that address has an account, a reset link is on its way."
                : "We'll email you a link to choose a new one."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <p className="text-sm text-muted-foreground text-center">
                The link expires shortly. <Link href="/login">Back to sign in</Link>
              </p>
            ) : (
              <form action={request} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" autoComplete="email" required />
                </div>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <SubmitButton pendingLabel="Sending…">Send reset link</SubmitButton>
                <p className="text-sm text-muted-foreground text-center">
                  <Link href="/login">Back to sign in</Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
