"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, User, Lock, Mail, Camera } from "lucide-react";
import { AvatarUpload } from "@/components/blocks/avatar-upload";
import { changePassword, removeAvatar, type AccountResult } from "@/app/actions/account";
import { useUploadThing } from "@/lib/uploadthing-client";

interface AccountUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string | null;
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

const initialPasswordState: AccountResult = { success: false };

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
  const router = useRouter();
  const [passwordState, passwordAction, passwordPending] = useActionState(
    changePassword,
    initialPasswordState
  );

  const { startUpload } = useUploadThing("avatarUploader");

  async function handleAvatarUpload(file: File): Promise<{ url?: string; error?: string }> {
    try {
      const res = await startUpload([file]);
      const url = res?.[0]?.ufsUrl;
      if (!url) return { error: "Upload failed" };
      router.refresh();
      return { url };
    } catch {
      return { error: "Upload failed" };
    }
  }

  async function handleAvatarRemove() {
    const result = await removeAvatar();
    if (!result.error) router.refresh();
    return result;
  }

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

  const fallbackInitials = user.name
    ? user.name.slice(0, 2).toUpperCase()
    : user.email.slice(0, 2).toUpperCase();

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
              <Camera className="h-5 w-5" />
              Avatar
            </CardTitle>
            <CardDescription>Upload a profile picture</CardDescription>
          </CardHeader>
          <CardContent>
            <AvatarUpload
              currentAvatarUrl={user.avatarUrl ?? null}
              fallback={fallbackInitials}
              onUpload={handleAvatarUpload}
              onRemove={handleAvatarRemove}
            />
          </CardContent>
        </Card>

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
              <form action={passwordAction} className="space-y-4">
                {passwordState.error && (
                  <p className="text-sm text-destructive">{passwordState.error}</p>
                )}
                {passwordState.success && (
                  <p className="text-sm text-success">
                    Password changed successfully.
                  </p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current password</Label>
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    required
                  />
                  {passwordState.fieldErrors?.currentPassword && (
                    <p className="text-xs text-destructive">
                      {passwordState.fieldErrors.currentPassword[0]}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New password</Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    required
                    minLength={8}
                  />
                  {passwordState.fieldErrors?.newPassword && (
                    <p className="text-xs text-destructive">
                      {passwordState.fieldErrors.newPassword[0]}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm new password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                  />
                  {passwordState.fieldErrors?.confirmPassword && (
                    <p className="text-xs text-destructive">
                      {passwordState.fieldErrors.confirmPassword[0]}
                    </p>
                  )}
                </div>
                <Button type="submit" disabled={passwordPending}>
                  {passwordPending ? "Changing..." : "Change password"}
                </Button>
              </form>
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
