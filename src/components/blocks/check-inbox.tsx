import { useState } from "react";
import { attempt, authClient } from "@/lib/auth-client";
import { SubmitButton } from "@/components/blocks/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Where sign-up lands once an address has to be verified before it can be used.
 *
 * It exists because of how Better Auth sends that mail: `sendVerificationEmail` runs as a
 * **background task**, so a failed send is logged and never reaches the request. Sign-up
 * answers 200 and creates the account whether or not any mail went out. A screen that said
 * "check your inbox" and nothing else would therefore be a dead end for anyone whose mail
 * failed, was filtered, or went to a typo'd address — which is why resending is offered here
 * rather than being something to ask support for.
 */
export function CheckInbox({ email, title = "Check your inbox" }: { email: string; title?: string }) {
  const [note, setNote] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  async function resend() {
    setNote(undefined);
    setError(undefined);
    const failure = await attempt(
      () => authClient.sendVerificationEmail({ email, callbackURL: "/dashboard" }),
      "Could not send another email",
    );
    if (failure) {
      setError(failure);
      return;
    }
    setNote("Sent. It can take a minute to arrive.");
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="mx-auto max-w-sm w-full">
        <div className="flex justify-center mb-8">
          <img src="/logo.png" alt="Diamondheart" className="h-16 w-16 object-contain" />
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>
              We sent a link to <span className="font-medium">{email}</span>. Open it to finish
              setting up your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm text-muted-foreground text-center">
              Nothing arrived? Check spam, then send another.
            </p>
            <form action={resend}>
              <SubmitButton pendingLabel="Sending…" className="w-full" variant="outline">
                Send another email
              </SubmitButton>
            </form>
            {note ? <p className="text-sm text-muted-foreground text-center">{note}</p> : null}
            {error ? <p className="text-sm text-destructive text-center">{error}</p> : null}
            <p className="text-sm text-muted-foreground text-center">
              <a href="/login" className="underline">
                Back to sign in
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
