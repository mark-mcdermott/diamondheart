"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X, ChevronDown, Github, Gem, Heart } from "lucide-react";
import { Sheet, SheetContent, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AvatarMenu } from "@/components/blocks/avatar-menu";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface NavLink {
  label?: string;
  href?: string;
  icon?: "github";
  hideWhenAuth?: boolean;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
  children?: { label: string; href: string }[];
}

interface NavProps {
  siteName?: string;
  logo?: string;
  user?: { id: string; email: string; name?: string | null; avatarUrl?: string | null } | null;
  isAdmin?: boolean;
  links?: NavLink[];
  showThemeToggle?: boolean;
}

export function Nav({
  siteName,
  logo,
  user = null,
  isAdmin = false,
  links = [],
  showThemeToggle = true,
}: NavProps) {
  const [open, setOpen] = useState(false);
  const isLoggedIn = !!user;
  const isLogoImage = logo && (logo.startsWith("/") || logo.startsWith("http") || logo.endsWith(".svg"));

  const visibleLinks = links.filter((link) => {
    if (link.requiresAuth && !isLoggedIn) return false;
    if (link.requiresAdmin && !isAdmin) return false;
    if (link.hideWhenAuth && isLoggedIn) return false;
    return true;
  });

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="group flex items-center gap-2 font-semibold no-underline">
          <span className="flex items-center transition-colors" style={{ color: "#fa40f2", filter: "drop-shadow(rgba(0,0,0,0.2) 1px 1px 2px)" }}>
            <Gem className="h-[1.875rem] w-[1.875rem]" />
            <Heart className="h-[1.875rem] w-[1.875rem]" fill="currentColor" />
          </span>
          {siteName && <span>{siteName}</span>}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-4 md:flex">
          {visibleLinks.map((link, i) => {
            if (link.children) {
              return (
                <DropdownMenu key={link.label || i}>
                  <DropdownMenuTrigger className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground cursor-pointer">
                    {link.label}
                    <ChevronDown className="h-3 w-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {link.children.map((child) => (
                      <DropdownMenuItem key={child.href} asChild className="cursor-pointer">
                        <Link href={child.href} className="no-underline">
                          {child.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }

            if (link.icon === "github" && link.href) {
              return (
                <a key="github" href={link.href} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                  <Github className="h-5 w-5" />
                </a>
              );
            }

            if (link.href) {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground no-underline"
                >
                  {link.label}
                </Link>
              );
            }

            return null;
          })}
          {showThemeToggle && <ThemeToggle />}
          {user && (
            <AvatarMenu
              user={{
                displayName: user.name || user.email,
                email: user.email,
                avatarUrl: user.avatarUrl,
              }}
            />
          )}
        </nav>

        {/* Mobile nav */}
        <div className="flex items-center gap-2 md:hidden">
          {showThemeToggle && <ThemeToggle />}
          {user && (
            <AvatarMenu
              user={{
                displayName: user.name || user.email,
                email: user.email,
                avatarUrl: user.avatarUrl,
              }}
            />
          )}
          <Sheet open={open} onOpenChange={setOpen}>
            <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
              <Menu className="h-6 w-6" strokeWidth={2.5} />
            </Button>
            <SheetContent side="right" className="w-[300px] px-6 pt-0" showCloseButton={false}>
              {/* Close button in same position as hamburger */}
              <div className="flex items-center justify-end h-14 -mr-2">
                <SheetClose asChild>
                  <Button variant="ghost" size="icon">
                    <X className="h-6 w-6" strokeWidth={2.5} />
                  </Button>
                </SheetClose>
              </div>

              <nav className="flex flex-col gap-1 pb-8">
                {visibleLinks.map((link, i) => {
                  if (link.children) {
                    return (
                      <div key={link.label || i} className="py-2 px-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {link.label}
                        </span>
                        <div className="flex flex-col gap-0.5 mt-2">
                          {link.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => setOpen(false)}
                              className="text-sm py-2 px-3 rounded-md no-underline text-foreground hover:bg-muted transition-colors"
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                        <Separator className="mt-3" />
                      </div>
                    );
                  }

                  if (link.icon === "github" && link.href) {
                    return (
                      <a
                        key="github"
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 text-sm py-2.5 px-3 rounded-md no-underline text-foreground hover:bg-muted transition-colors"
                      >
                        <Github className="h-4 w-4" />
                        GitHub
                      </a>
                    );
                  }

                  if (link.href) {
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className="text-sm font-medium py-2.5 px-3 rounded-md no-underline text-foreground hover:bg-muted transition-colors"
                      >
                        {link.label}
                      </Link>
                    );
                  }

                  return null;
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
