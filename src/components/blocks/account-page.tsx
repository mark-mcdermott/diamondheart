import { Link } from "@/app/link";
import { useState } from "react";
import { useRouter } from "@/app/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, api, authHeaders, errorMessage, keys } from "@/app/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, User, Lock, Mail, Camera, ChevronRight, HeartPulse } from "lucide-react";
import { AvatarUpload } from "@/components/blocks/avatar-upload";
import { BiometricUnlockToggle } from "@/components/biometric-unlock-toggle";
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

interface PasswordFormState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

const MIN_PASSWORD_LENGTH = 8;

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const [passwordState, setPasswordState] = useState<PasswordFormState>({});

  // The sidebar's avatar is still server-rendered until Phase 4, so a route
  // refresh goes with the refetch.
  function refreshUser() {
    void queryClient.invalidateQueries({ queryKey: keys.me });
    router.refresh();
  }

  const changePassword = useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) => api.account.changePassword(input),
    onSuccess: () => setPasswordState({ success: true }),
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.fields) setPasswordState({ fieldErrors: error.fields });
      else setPasswordState({ error: errorMessage(error) });
    },
  });
  const passwordPending = changePassword.isPending;

  function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const currentPassword = field(fd, "currentPassword");
    const newPassword = field(fd, "newPassword");
    const confirmPassword = field(fd, "confirmPassword");

    const fieldErrors: Record<string, string[]> = {};
    if (!currentPassword) fieldErrors.currentPassword = ["Current password is required"];
    if (newPassword.length < MIN_PASSWORD_LENGTH) fieldErrors.newPassword = [`New password must be at least ${MIN_PASSWORD_LENGTH} characters`];
    if (newPassword !== confirmPassword) fieldErrors.confirmPassword = ["Passwords do not match"];
    if (Object.keys(fieldErrors).length > 0) {
      setPasswordState({ fieldErrors });
      return;
    }

    setPasswordState({});
    changePassword.mutate({ currentPassword, newPassword }, { onSuccess: () => form.reset() });
  }

  // The route resolves the session itself; the bundle has only the bearer token to offer it.
  const { startUpload } = useUploadThing("avatarUploader", { headers: authHeaders });

  async function handleAvatarUpload(file: File): Promise<{ url?: string; error?: string }> {
    try {
      const res = await startUpload([file]);
      const url = res?.[0]?.ufsUrl;
      if (!url) return { error: "Upload failed" };
      refreshUser();
      return { url };
    } catch {
      return { error: "Upload failed" };
    }
  }

  async function handleAvatarRemove(): Promise<{ error?: string }> {
    try {
      await api.account.removeAvatar();
      refreshUser();
      return {};
    } catch (cause) {
      return { error: errorMessage(cause) };
    }
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
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
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

        <BiometricUnlockToggle />

        <Card className="p-0">
          <Link
            href="/account/integrations"
            className="flex items-center justify-between gap-4 rounded-[inherit] px-6 py-6 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <HeartPulse className="h-5 w-5" />
                Integrations
              </CardTitle>
              <CardDescription>Sync Apple Health and Oura into your tracking</CardDescription>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </Link>
        </Card>

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
