"use client";

import Link from "next/link";
import Image from "next/image";

interface NavLink {
  href: string;
  label: string;
}

interface SimpleNavProps {
  siteName?: string;
  logo?: string;
  logoIcon?: string;
  links?: NavLink[];
}

export function SimpleNav({ siteName, logo, logoIcon, links = [] }: SimpleNavProps) {
  const isLogoImage = logo && (logo.startsWith("/") || logo.startsWith("http"));

  return (
    <nav className="flex items-center justify-between px-8 py-6">
      <Link href="/" className="flex items-center gap-2 no-underline">
        {logoIcon && <span className="text-2xl">{logoIcon}</span>}
        {isLogoImage && (
          <Image src={logo} alt="" width={32} height={32} className="rounded" />
        )}
        {logo && !isLogoImage && <span className="text-2xl">{logo}</span>}
        {siteName && <span className="font-bold text-lg">{siteName}</span>}
      </Link>

      {links.length > 0 && (
        <div className="flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground no-underline"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
