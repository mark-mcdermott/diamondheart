"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AvatarMenu } from "@/components/blocks/avatar-menu";

interface TopBarProps {
  siteName: string;
  logoIcon?: string;
  user: {
    id: string;
    displayName: string;
    email: string;
    avatarUrl?: string | null;
  };
  workspaceName?: string;
  projectName?: string;
}

export function TopBar({
  siteName,
  logoIcon,
  user,
  workspaceName,
  projectName,
}: TopBarProps) {
  const [open, setOpen] = useState(false);
  const _pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-[100vw] items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold no-underline"
          >
            {logoIcon && <span className="text-xl">{logoIcon}</span>}
            <span className="hidden sm:inline">{siteName}</span>
          </Link>

          {/* Breadcrumb */}
          {workspaceName && (
            <div className="hidden items-center gap-1 text-sm text-muted-foreground sm:flex">
              <span>/</span>
              <span className="font-medium text-foreground">
                {workspaceName}
              </span>
              {projectName && (
                <>
                  <span>/</span>
                  <span className="font-medium text-foreground">
                    {projectName}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Desktop */}
        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground no-underline"
          >
            Home
          </Link>
          <ThemeToggle />
          <AvatarMenu user={user} />
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onTouchEnd={(e) => {
                  e.preventDefault();
                  setOpen(true);
                }}
              >
                <Menu className="h-5 w-5 pointer-events-none" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <nav className="flex flex-col gap-4 pt-8">
                <Link
                  href="/"
                  onClick={() => setOpen(false)}
                  className="text-lg font-medium no-underline"
                >
                  Home
                </Link>
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className="text-lg font-medium no-underline"
                >
                  Account
                </Link>
                <form action="/api/auth/logout" method="POST">
                  <button
                    type="submit"
                    className="text-lg font-medium text-destructive"
                  >
                    Sign out
                  </button>
                </form>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
