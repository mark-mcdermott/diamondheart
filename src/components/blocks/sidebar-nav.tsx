"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  SquaresFour,
  FlowerLotus,
  ForkKnife,
  Compass,
  Stethoscope,
  CalendarCheck,
  TelevisionSimple,
  Barbell,
  CurrencyDollar,
  ChartBar,
  Bell,
  GearSix,
  List,
  X,
  Pulse,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { Sheet, SheetContent, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AvatarMenu } from "@/components/blocks/avatar-menu";
import { Separator } from "@/components/ui/separator";

export interface NavLink {
  label?: string;
  href?: string;
  icon?: "github";
  hideWhenAuth?: boolean;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
  children?: { label: string; href: string }[];
}

interface SidebarNavProps {
  siteName?: string;
  logo?: string;
  user?: { id: string; email: string; name?: string | null; avatarUrl?: string | null } | null;
  isAdmin?: boolean;
  links?: NavLink[];
  showThemeToggle?: boolean;
  notificationCount?: number;
  showSiteName?: boolean;
}

// Map nav hrefs to icons
const iconMap: Record<string, PhosphorIcon> = {
  "/dashboard": SquaresFour,
  "/metrics": ChartBar,
  "/meditate": FlowerLotus,
  "/food": ForkKnife,
  "/tracking": Compass,
  "/medical": Stethoscope,
  "/appointments": CalendarCheck,
  "/entertainment": TelevisionSimple,
  "/workout": Barbell,
  "/finances": CurrencyDollar,
};

function getNavIcon(href: string): PhosphorIcon {
  return iconMap[href] ?? Pulse;
}

export function SidebarNav({
  siteName: _siteName,
  logo,
  user = null,
  isAdmin = false,
  links = [],
  showThemeToggle = true,
  notificationCount = 0,
  showSiteName: _showSiteName = true,
}: SidebarNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isLoggedIn = !!user;

  const allVisibleLinks = links.filter((link) => {
    if (link.href === "/metrics") return false;
    if (link.requiresAuth && !isLoggedIn) return false;
    if (link.requiresAdmin && !isAdmin) return false;
    if (link.hideWhenAuth && isLoggedIn) return false;
    return true;
  });

  return (
    <>
      {/* Desktop sidebar — icon rail */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 z-50 w-[68px] flex-col items-center py-5 bg-card/80 backdrop-blur-xl border-r border-border">
        {/* Logo */}
        <Link href="/" className="mb-6 flex items-center justify-center shrink-0">
          <img src={logo || "/logo.png"} alt="Diamondheart" className="h-10 w-10 object-contain" />
        </Link>

        <Separator className="w-8 mb-4" />

        {/* Nav links */}
        <nav className="flex flex-1 flex-col items-center gap-1 overflow-y-auto">
          {allVisibleLinks.map((link) => {
            if (!link.href) return null;
            const Icon = getNavIcon(link.href);
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  group relative flex items-center justify-center w-11 h-11 rounded-xl
                  transition-all duration-200 no-underline
                  ${isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }
                `}
                title={link.label}
              >
                <Icon className="w-5 h-5" weight={isActive ? "bold" : "regular"} />
                {/* Tooltip */}
                <span className="
                  absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium
                  bg-card text-foreground border border-border shadow-md
                  opacity-0 pointer-events-none group-hover:opacity-100
                  transition-opacity duration-150 whitespace-nowrap z-50
                ">
                  {link.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="flex flex-col items-center gap-2 mt-auto pt-4">
          <Separator className="w-8 mb-2" />

          {/* Notifications */}
          {user && (
            <Link
              href="/notifications"
              className={`
                relative flex items-center justify-center w-11 h-11 rounded-xl
                transition-all duration-200 no-underline
                ${pathname === "/notifications"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }
              `}
              title="Notifications"
            >
              <Bell className="w-5 h-5" weight="regular" />
              {notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
              )}
            </Link>
          )}

          {showThemeToggle && <ThemeToggle />}

          {/* Avatar */}
          {user && (
            <div className="mt-1">
              <AvatarMenu
                user={{
                  displayName: user.name || user.email,
                  email: user.email,
                  avatarUrl: user.avatarUrl,
                }}
                notificationCount={notificationCount}
              />
            </div>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-50 w-full bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 no-underline shrink-0">
            <img src={logo || "/logo.png"} alt="Diamondheart" className="h-8 w-8 object-contain" />
            <span className="font-display text-base font-semibold" style={{ color: "var(--app-heading-color)" }}>
              Diamondheart
            </span>
          </Link>

          <div className="flex items-center gap-1">
            {showThemeToggle && <ThemeToggle />}
            {user && (
              <Link
                href="/notifications"
                className="relative text-muted-foreground hover:text-foreground p-2 no-underline"
              >
                <Bell className="h-5 w-5" weight="regular" />
                {notificationCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
                )}
              </Link>
            )}
            {user && (
              <AvatarMenu
                user={{
                  displayName: user.name || user.email,
                  email: user.email,
                  avatarUrl: user.avatarUrl,
                }}
                notificationCount={notificationCount}
              />
            )}
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="text-foreground">
              <List className="h-5 w-5" weight="bold" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {allVisibleLinks.slice(0, 5).map((link) => {
            if (!link.href) return null;
            const Icon = getNavIcon(link.href);
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl
                  transition-all duration-200 no-underline min-w-[52px]
                  ${isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                  }
                `}
              >
                <Icon className="w-5 h-5" weight={isActive ? "bold" : "regular"} />
                <span className="text-[10px] font-medium leading-none">{link.label}</span>
              </Link>
            );
          })}
          {allVisibleLinks.length > 5 && (
            <button
              onClick={() => setMobileOpen(true)}
              className={`
                flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl
                transition-all duration-200 min-w-[52px] text-muted-foreground cursor-pointer
              `}
            >
              <List className="w-5 h-5" weight="regular" />
              <span className="text-[10px] font-medium leading-none">More</span>
            </button>
          )}
        </div>
      </nav>

      {/* Mobile full nav sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-[280px] px-5 pt-0" showCloseButton={false}>
          <div className="flex items-center justify-end h-14 -mr-1">
            <SheetClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-5 w-5" weight="bold" />
              </Button>
            </SheetClose>
          </div>

          <nav className="flex flex-col gap-0.5 pb-8">
            {allVisibleLinks.map((link) => {
              if (!link.href) return null;
              const Icon = getNavIcon(link.href);
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    flex items-center gap-3 text-sm py-2.5 px-3 rounded-xl no-underline
                    transition-all duration-200
                    ${isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-foreground hover:bg-secondary"
                    }
                  `}
                >
                  <Icon className="w-4.5 h-4.5" weight={isActive ? "bold" : "regular"} />
                  {link.label}
                </Link>
              );
            })}

            <Separator className="my-3" />

            <Link
              href="/settings"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 text-sm py-2.5 px-3 rounded-xl no-underline text-foreground hover:bg-secondary transition-all duration-200"
            >
              <GearSix className="w-4.5 h-4.5" weight="regular" />
              Settings
            </Link>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
