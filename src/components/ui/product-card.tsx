import { Link } from "@/app/link";
import { cn } from "@/lib/utils";

export function ProductCard({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn("group block no-underline relative", className)}>
      {children}
    </Link>
  );
}

export function ProductCardImage({ src, alt = "" }: { src?: string; alt?: string }) {
  return (
    <div className="aspect-square overflow-hidden rounded-lg bg-muted mb-3">
      {src ? (
        <img
          src={src}
          alt={alt}
          width={400}
          height={400}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
      )}
    </div>
  );
}

export function ProductCardName({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn("font-medium text-foreground group-hover:text-muted-foreground transition-colors line-clamp-2", className)}>
      {children}
    </h3>
  );
}

export function ProductCardPrice({
  price,
  compareAtPrice,
  currency = "$",
}: {
  price: number;
  compareAtPrice?: number;
  currency?: string;
}) {
  return (
    <div className="flex items-center gap-2 mt-1">
      <span className={cn("font-semibold", compareAtPrice ? "text-red-600" : "text-foreground")}>
        {currency}{(price / 100).toFixed(2)}
      </span>
      {compareAtPrice && (
        <span className="text-sm text-muted-foreground line-through">
          {currency}{(compareAtPrice / 100).toFixed(2)}
        </span>
      )}
    </div>
  );
}

const badgeVariants = {
  sale: "bg-red-500 text-white",
  new: "bg-emerald-500 text-white",
  featured: "bg-amber-500 text-white",
  "out-of-stock": "bg-muted-foreground text-white",
};

export function ProductCardBadge({ variant, children }: { variant: keyof typeof badgeVariants; children: React.ReactNode }) {
  return (
    <span className={cn("absolute top-2 left-2 px-2 py-1 text-xs font-medium rounded", badgeVariants[variant])}>
      {children}
    </span>
  );
}
