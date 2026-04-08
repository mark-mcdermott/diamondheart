"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, User, Lock, Mail } from "lucide-react";

interface AccountUser {
  id: string;
  email: string;
  name?: string;
}

interface AccountPageProps {
  user: AccountUser | null;
  error?: string;
  success?: string;
  backHref?: string;
  backLabel?: string;
  loginHref?: string;
  showPasswordSection?: boolean;
  action?: (formData: FormData) => void;
  className?: string;
}

export function AccountPage({
  user,
  error,
  success,
  backHref,
  backLabel,
  loginHref = "/login",
  showPasswordSection = true,
  action,
  className,
}: AccountPageProps) {
  if (!user) {
    return (
      <div className={className}>
        <p className="text-muted-foreground">
          Please{" "}
          <Link href={loginHref} className="text-primary">
            sign in
          </Link>{" "}
          to view your account.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 no-underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel || "Back"}
        </Link>
      )}

      <h1 className="text-3xl font-bold mb-8">Account</h1>

      {error && <div className="alert alert-error mb-4">{error}</div>}
      {success && <div className="alert alert-success mb-4">{success}</div>}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>Update your display name and email</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={action} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={user.name || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="inline h-4 w-4 mr-1" />
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={user.email}
                />
              </div>
              <Button type="submit">Save changes</Button>
            </form>
          </CardContent>
        </Card>

        {showPasswordSection && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>Change your password</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current password</Label>
                  <Input id="currentPassword" type="password" disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New password</Label>
                  <Input id="newPassword" type="password" disabled />
                </div>
                <p className="text-sm text-muted-foreground">
                  Password changes coming soon.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Account info</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              User ID: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{user.id}</code>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
