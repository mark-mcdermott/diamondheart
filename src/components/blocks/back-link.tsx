import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface BackLinkProps {
  href: string;
  label?: string;
}

export function BackLink({ href, label = "Back" }: BackLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground no-underline"
    >
      <ChevronLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}
