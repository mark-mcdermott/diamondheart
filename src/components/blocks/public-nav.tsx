"use client";

import { Link } from "@/app/link";
import { usePathname } from "@/app/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface PublicNavProps {
  siteName: string;
  logoIcon?: string;
  logoImage?: string;
}

export function PublicNav({ siteName, logoIcon: _logoIcon, logoImage: _logoImage }: PublicNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const links = [
    { href: "/about", label: "About" },
    { href: "/pricing", label: "Pricing" },
  ];

  const _authLinks = [
    { href: "/login", label: "Log in" },
    { href: "/signup", label: "Sign up" },
  ];

  return (
    <header className="w-full border-b border-border bg-background shadow-[0_4px_14px_-6px_rgba(28,22,18,0.06)]">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href="/"
          className="group flex items-center gap-2 font-semibold no-underline"
        >
          <span>{siteName}</span>
        </Link>

        {/* Desktop */}
        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link text-sm transition-colors no-underline ${
                pathname === link.href
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="nav-link text-sm font-medium text-muted-foreground hover:text-foreground transition-colors no-underline"
          >
            Log in
          </Link>
          <ThemeToggle />
          <Button asChild size="sm">
            <Link href="/signup">Sign up</Link>
          </Button>
        </nav>

        {/* Mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button type="button" className="flex items-center justify-center w-10 h-10 text-accent cursor-pointer">
                <Menu width={28} height={28} className="pointer-events-none" />
                <span className="sr-only">Open menu</span>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]" showCloseButton={false}>
              <div className="flex items-center justify-between px-4 py-4">
                <ThemeToggle />
                <SheetClose className="sheet-close rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden disabled:pointer-events-none">
                  <X width={28} height={28} />
                  <span className="sr-only">Close</span>
                </SheetClose>
              </div>
              <nav className="flex flex-col gap-6 px-6">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="nav-link text-lg font-bold no-underline"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="nav-link text-lg font-bold no-underline"
                >
                  Log in
                </Link>
                <Button asChild size="lg" className="w-full">
                  <Link href="/signup" onClick={() => setOpen(false)}>
                    Sign up
                  </Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
