import { useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, errorMessage, keys } from "@/app/api";
import { BiometricLockGate } from "@/components/biometric-lock-gate";
import { SidebarNav, type NavLink } from "@/components/blocks/sidebar-nav";
import { RetryCard } from "@/components/ui/retry-card";
import { syncDeviceToken } from "@/lib/native-push";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The signed-in chrome, which the Next layout used to render on the server:
 * who is signed in, the nav items they chose, the unread badge and the site
 * name preference all come through the API now. Signed-out sends the browser
 * to sign in with the path remembered; the applet never shows an empty screen
 * that looks like owning nothing.
 */
export function AppShell({ children, onSignedOut }: { children: ReactNode; onSignedOut?: () => void }) {
  const me = useQuery({ queryKey: keys.me, queryFn: api.auth.me });
  const signedIn = me.isSuccess && me.data !== null;
  const nav = useQuery({ queryKey: keys.nav, queryFn: api.nav.list, enabled: signedIn });
  const preferences = useQuery({ queryKey: keys.preferences, queryFn: api.preferences.get, enabled: signedIn });
  const notifications = useQuery({ queryKey: keys.notifications, queryFn: api.notifications.list, enabled: signedIn });

  // Push registration asks the platform for permission, so it waits for a
  // signed-in user rather than greeting the sign-in screen with a prompt, and
  // the token it stores is then stored under that user.
  const userId = me.data?.id;
  useEffect(() => {
    if (userId) void syncDeviceToken();
  }, [userId]);

  useEffect(() => {
    if (!(me.isSuccess && me.data === null)) return;
    if (onSignedOut) {
      onSignedOut();
      return;
    }
    const here = window.location.pathname + window.location.search;
    window.location.assign(`/login?redirect=${encodeURIComponent(here)}`);
  }, [me.isSuccess, me.data, onSignedOut]);

  if (me.isError) {
    return (
      <main className="px-4 py-6 mx-auto w-full max-w-4xl">
        <RetryCard title="Diamondheart could not load" message={errorMessage(me.error)} onRetry={() => void me.refetch()} />
      </main>
    );
  }

  const user = me.data ?? null;
  if (!user) {
    return (
      <div className="min-h-screen" aria-busy="true" aria-label="Loading">
        <main className="md:ml-[68px] px-4 py-6 mx-auto w-full max-w-4xl">
          <Skeleton className="h-7 w-40 rounded-lg mb-8" />
          <Skeleton className="h-48 rounded-2xl" />
        </main>
      </div>
    );
  }
  const links: NavLink[] = (nav.data ?? [])
    .filter((item) => item.visible)
    .map((item) => ({ label: item.label, href: item.href, requiresAuth: true }));

  return (
    <BiometricLockGate>
      <div className="min-h-screen">
        <SidebarNav
          siteName="Diamondheart"
          logo="/logo.png"
          links={links}
          user={{ id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl }}
          notificationCount={notifications.data?.unread ?? 0}
          showSiteName={preferences.data?.showSiteName ?? true}
          showThemeToggle
        />
        <main className="md:ml-[68px] px-4 py-6 pb-24 md:pb-6 mx-auto w-full max-w-4xl">{children}</main>
      </div>
    </BiometricLockGate>
  );
}
