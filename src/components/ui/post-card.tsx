import { Link } from "@/app/link";
import { cn } from "@/lib/utils";

export function PostCard({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn("group block no-underline", className)}>
      {children}
    </Link>
  );
}

export function PostCardImage({ src, alt = "" }: { src?: string; alt?: string }) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      width={600}
      height={300}
      className="w-full h-48 object-cover rounded-lg mb-4"
    />
  );
}

export function PostCardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("text-2xl font-semibold group-hover:text-muted-foreground transition-colors", className)}>
      {children}
    </h2>
  );
}

export function PostCardExcerpt({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-muted-foreground mt-2 leading-relaxed", className)}>{children}</p>;
}

export function PostCardDate({
  date,
  format,
}: {
  date?: Date | string | null;
  format?: Intl.DateTimeFormatOptions;
}) {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  const formatted = d.toLocaleDateString("en-US", format || { year: "numeric", month: "long", day: "numeric" });

  return <time className="text-sm text-muted-foreground mt-3 block">{formatted}</time>;
}
