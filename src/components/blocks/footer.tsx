import Link from "next/link";
import { Heart } from "lucide-react";

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

export function Footer({ siteName: _siteName, links = [], logoIcon: _logoIcon, logoImage: _logoImage }: FooterProps) {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} Diamondheart</span>
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
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>Built with</span>
          <Heart className="h-3.5 w-3.5" fill="currentColor" />
          <span>by</span>
          <a href="https://markmcdermott.io" target="_blank" rel="noopener noreferrer" className="!underline underline-offset-4 !text-muted-foreground !font-normal">Mark McDermott</a>
        </div>
      </div>
    </footer>
  );
}
