import { authClient } from "@/lib/auth-client";
import { NATIVE } from "@/app/platform";
import { clearToken } from "@/lib/session-token";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AvatarMenuProps {
  user: {
    displayName: string;
    email: string;
    avatarUrl?: string | null;
  };
  notificationCount?: number;
  /** How to reach a menu item: the applet passes its router, the public nav leaves it to the browser. */
  onNavigate?: (href: string) => void;
}

export function AvatarMenu({ user, notificationCount = 0, onNavigate }: AvatarMenuProps) {
  const go = onNavigate ?? ((href: string) => window.location.assign(href));
  const initials = user.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleLogout() {
    await authClient.signOut();
    await clearToken();
    // A full load: the applet's caches and the public nav's user store both
    // start over. The bundle reloads into its own sign-in screen.
    if (NATIVE) window.location.reload();
    else window.location.assign("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Account menu" className="flex items-center gap-2 outline-none transition-colors hover:text-black dark:hover:text-white cursor-pointer">
        <span className="relative">
          <Avatar key={user.avatarUrl ?? "no-avatar"} className="h-8 w-8">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.displayName} />}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{user.displayName}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => go("/account")} className="cursor-pointer">
          Account
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => go("/orders")} className="cursor-pointer">
          Orders
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => go("/metrics")} className="cursor-pointer">
          Metrics
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => go("/settings")} className="cursor-pointer">
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
