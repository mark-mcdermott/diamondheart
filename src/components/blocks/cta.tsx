import { Link } from "@/app/link";
import { Button } from "@/components/ui/button";

interface CtaProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
}

export function Cta({
  title,
  description,
  children,
  primaryCta,
  secondaryCta,
}: CtaProps) {
  return (
    <section className="border-t border-border bg-muted/50 px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-4 text-lg text-muted-foreground">{description}</p>
        )}
        {children}
        {(primaryCta || secondaryCta) && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {primaryCta && (
              <Button asChild size="lg">
                <Link href={primaryCta.href}>{primaryCta.label}</Link>
              </Button>
            )}
            {secondaryCta && (
              <Button asChild variant="outline" size="lg">
                <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
