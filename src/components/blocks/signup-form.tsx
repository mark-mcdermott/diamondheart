"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SignupFormProps {
  title?: string;
  description?: string;
  loginHref?: string;
  loginText?: string;
  error?: string;
  action?: (formData: FormData) => void;
  className?: string;
}

export function SignupForm({
  title = "Create an account",
  description,
  loginHref = "/login",
  loginText,
  error,
  action,
  className,
}: SignupFormProps) {
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
                <Label htmlFor="name">Name (optional)</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
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
                />
              </div>
              <Button type="submit" className="w-full">
                Create account
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              {loginText || (
                <>
                  Already have an account?{" "}
                  <Link href={loginHref} className="text-primary font-medium">
                    Sign in
                  </Link>
                </>
              )}
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
