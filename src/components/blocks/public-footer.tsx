import Link from "next/link";

interface PublicFooterProps {
  siteName: string;
}

function HeartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15.13 14.55" className="inline-block h-4 w-4">
      <path fill="#010101" d="M4.06,0c.67.07,1.32.28,1.89.66.26.17.47.37.7.58.19.18.39.34.57.56C7.95.79,8.97.12,10.21.01c.02,0,.03,0,.03-.01h.58c.95.09,1.83.48,2.5,1.19.57.44.98,1.05,1.2,1.73.06.18.12.34.2.51.31.65.43,1.39.4,2.11-.07,1.47-.5,2.75-1.51,3.84-.3.32-.59.64-.92.93l-.94.85-3.79,3.39-3.71-3.32-.94-.85c-.44-.4-.85-.82-1.25-1.27-.48-.53-.86-1.13-1.1-1.81C.41,6.48.12,5.55.03,4.56c0,0-.02-.26-.03-.2v-.8c0-.34.1-.68.21-1.02.17-.53.45-1,.83-1.39C1.69.47,2.55.1,3.48,0h.58ZM12.5,7.8c.6-.64,1.03-1.39,1.24-2.24.15-.57.22-1.15.2-1.74-.02-.9-.31-1.76-.94-2.41-1.21-1.24-3.16-1.37-4.55-.34-.57.43-.91.88-1.3,1.5l-.43-.63c-.2-.29-.45-.53-.73-.76-.66-.54-1.49-.83-2.35-.8s-1.72.4-2.34,1.03S.41,2.88.38,3.77c-.02.62.05,1.23.21,1.83.23.85.66,1.6,1.27,2.23.29.3.56.59.87.87l.97.87,3.47,3.1,3.49-3.13.85-.76c.35-.31.66-.64.99-.99Z" />
      <path fill="#fe1492" d="M12.5,7.8c-.32.35-.64.68-.99.99l-.85.76-3.49,3.13-3.47-3.1-.97-.87c-.31-.28-.58-.57-.87-.87-.6-.63-1.04-1.39-1.27-2.23-.16-.6-.23-1.21-.21-1.83.03-.88.31-1.72.94-2.36S2.77.41,3.66.38s1.69.26,2.35.8c.28.23.53.47.73.76l.43.63c.39-.62.72-1.07,1.3-1.5,1.39-1.03,3.34-.9,4.55.34.63.65.92,1.51.94,2.41.01.59-.06,1.17-.2,1.74-.22.85-.64,1.6-1.24,2.24Z" />
    </svg>
  );
}

export function PublicFooter({ siteName: _siteName }: PublicFooterProps) {
  const links = [
    { href: "/about", label: "About" },
    { href: "/pricing", label: "Pricing" },
    { href: "/design", label: "Design" },
    { href: "/contact", label: "Contact" },
    { href: "/terms", label: "Terms" },
    { href: "/privacy", label: "Privacy" },
  ];

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-8">
        <nav className="flex flex-wrap justify-center gap-4">
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
        <p className="flex items-center justify-center gap-1 text-sm font-semibold text-muted-foreground">
          Made with <HeartIcon /> with{" "}
          <a
            href="https://cleanroom.website"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-credit-link font-bold no-underline"
          >
            Cleanroom
          </a>
        </p>
      </div>
    </footer>
  );
}
