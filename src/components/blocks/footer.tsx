import Link from "next/link";

interface FooterLink {
  href: string;
  label: string;
}

interface FooterProps {
  siteName: string;
  links?: FooterLink[];
  logoIcon?: string;
  logoImage?: string;
}

export function Footer({ siteName, links = [], logoIcon, logoImage }: FooterProps) {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} {siteName}</span>
        </div>
        {links.length > 0 && (
          <nav className="flex gap-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground no-underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </footer>
  );
}
