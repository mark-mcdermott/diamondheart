import { useState } from "react";
import { Link } from "@/app/link";
import { SubmitButton } from "@/components/blocks/submit-button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SignupFormProps {
  title?: string;
  description?: string;
  loginHref?: string;
  loginText?: string;
  /** Swaps the card for sign-in in place, where there is no page to link to (the native bundle). */
  onLogin?: () => void;
  error?: string;
  /** Receives the form's data; a client function is fine, React 19 awaits it. */
  action?: (formData: FormData) => void | Promise<void>;
  className?: string;
}

export function SignupForm({
  title = "Create an account",
  description,
  loginHref = "/login",
  loginText,
  onLogin,
  error,
  action,
  className,
}: SignupFormProps) {
  // React resets a form's fields once its action settles, which wiped the
  // address after a wrong password. The email is worth keeping; the password is not.
  const [email, setEmail] = useState("");
  return (
    <div className={className}>
      <div className="mx-auto max-w-sm w-full">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/logo.png" alt="Diamondheart" className="h-16 w-16 object-contain" />
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{title}</CardTitle>
            {description ? (
              <CardDescription>{description}</CardDescription>
            ) : (
              <CardDescription>Start your wellness journey today</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <form action={action} className="space-y-5">
              {error && (
                <div className="alert alert-error">{error}</div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name (optional)</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="h-12 text-base"
                />
              </div>
              <SubmitButton className="w-full h-12 text-base" pendingLabel="Creating account…">
                Create account
              </SubmitButton>
            </form>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              {loginText || (
                <>
                  Already have an account?{" "}
                  {onLogin ? (
                    <button type="button" onClick={onLogin} className="text-primary font-medium">
                      Sign in
                    </button>
                  ) : (
                    <Link href={loginHref} className="text-primary font-medium">
                      Sign in
                    </Link>
                  )}
                </>
              )}
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
