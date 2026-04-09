"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X, ChevronDown, Github } from "lucide-react";
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
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="361 189 74 42" className="h-7 w-auto" style={{ filter: "drop-shadow(rgba(0,0,0,0.2) 1px 1px 2px)" }}>
            <path fill="#f549dc" d="M383.75,222.41l4.93-16.02h0c-.13-.71-.2-1.44-.2-2.21h0c0-.46.02-.91.07-1.35h0l-2.97-7.13h3.57c.56,0,1.09.27,1.43.71l.28.37c.7-.99,1.53-1.87,2.48-2.63-1.01-1.26-2.56-2.01-4.18-2.01h-6.22s0,0-.01,0h-5.35s-.01,0-.02,0h-6.22c-1.68,0-3.28.8-4.28,2.14l-5.34,7.12c-1.42,1.9-1.44,4.46-.04,6.36l14.24,19.58c.34.47.75.88,1.22,1.22.92.66,2,1.01,3.11,1.01.29,0,.58-.02.87-.07,1.41-.23,2.65-1,3.47-2.15l9.01-12.39c-.83-.88-1.63-1.82-2.35-2.83l-7.48,10.28ZM378.75,195.7h2.97l2.97,7.13h-8.91l2.97-7.13ZM369.89,196.41c.33-.45.87-.72,1.43-.72h3.57l-2.97,7.13h-6.83l4.81-6.41ZM365.06,206.39h6.72l4.93,16.02-11.65-16.02ZM380.23,221.72l-4.72-15.33h9.43l-4.72,15.33Z"/>
            <path fill="#f549dc" d="M395.4,206.39h-6.72c.4,2.15,1.35,4.04,2.55,5.73l4.17-5.73Z"/>
            <path fill="#f549dc" d="M395.38,202.83l-4.54-6.05c-1.24,1.75-2.06,3.82-2.29,6.05h6.83Z"/>
            <path fill="#f549dc" d="M428.56,194.45c-5.16-4.51-12.97-4.28-17.84.39-2.44-2.31-5.7-3.61-9.1-3.61,0,0,0,0,0,0-3.14,0-6.03,1.1-8.3,2.92.03.04.07.08.1.13l5.35,7.13c1.42,1.9,1.44,4.46.04,6.37l-5.23,7.19c.52.55,1.05,1.09,1.57,1.6,0,0,.02.02.02.02l11.1,10.57c.15.16.32.32.49.47,1.14.98,2.55,1.46,3.96,1.46,1.66,0,3.31-.67,4.5-1.97l11.06-10.52s.02-.02.02-.02c3.23-3.17,6.67-7.01,6.67-12.37.02-3.72-1.59-7.27-4.41-9.74Z"/>
          </svg>
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
