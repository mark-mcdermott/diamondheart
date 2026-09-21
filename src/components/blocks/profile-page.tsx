import { Link } from "@/app/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings } from "lucide-react";

interface ProfileUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  createdAt?: string;
}

interface ProfilePageProps {
  user: ProfileUser;
  currentUserId?: string;
  backHref?: string;
  backLabel?: string;
  settingsHref?: string;
  className?: string;
}

export function ProfilePage({
  user,
  currentUserId,
  backHref = "/",
  backLabel,
  settingsHref = "/account",
  className,
}: ProfilePageProps) {
  const isOwnProfile = currentUserId === user.id;
  const initials = (user.name || user.email)
    .split(" ")
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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

      <div className="flex flex-col items-center text-center gap-4">
        <Avatar className="h-24 w-24">
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name || user.email} />}
          <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
        </Avatar>

        <div>
          <h1 className="text-3xl font-bold">
            {isOwnProfile ? "Your Profile" : user.name || user.email}
          </h1>
          {isOwnProfile && (
            <p className="text-muted-foreground mt-1">{user.email}</p>
          )}
        </div>

        {isOwnProfile && (
          <>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>User ID: {user.id}</p>
              {user.createdAt && (
                <p>Member since {new Date(user.createdAt).toLocaleDateString()}</p>
              )}
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={settingsHref}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
