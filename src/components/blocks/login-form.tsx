import { Link } from "@/app/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LoginFormProps {
  title?: string;
  description?: string;
  signupHref?: string;
  signupText?: string;
  /** Swaps the card for sign-up in place, where there is no page to link to (the native bundle). */
  onSignup?: () => void;
  error?: string;
  /** Receives the form's data; a client function is fine, React 19 awaits it. */
  action?: (formData: FormData) => void | Promise<void>;
  /** Disables the submit while a sign-in or sign-up call is in flight. */
  pending?: boolean;
  className?: string;
}

export function LoginForm({
  title = "Welcome back",
  description,
  signupHref = "/signup",
  signupText,
  onSignup,
  error,
  action,
  pending = false,
  className,
}: LoginFormProps) {
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
              <CardDescription>Sign in to continue your practice</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <form action={action} className="space-y-4">
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              {signupText || (
                <>
                  Don&apos;t have an account?{" "}
                  {onSignup ? (
                    <button type="button" onClick={onSignup} className="text-primary font-medium">
                      Sign up
                    </button>
                  ) : (
                    <Link href={signupHref} className="text-primary font-medium">
                      Sign up
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
