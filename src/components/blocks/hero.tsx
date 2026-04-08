import Link from "next/link";
import { Button } from "@/components/ui/button";

interface HeroProps {
  title: string;
  description?: string;
  tagline?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  logoIcon?: string;
  logoImage?: string;
  image?: string;
  imageSize?: "sm" | "md" | "lg";
}

const imageSizeClass = {
  sm: "h-16 w-auto",
  md: "h-32 w-auto",
  lg: "h-64 w-auto object-contain",
};

export function Hero({
  title,
  description,
  tagline,
  primaryCta,
  secondaryCta,
  logoIcon,
  logoImage,
  image,
  imageSize = "md",
}: HeroProps) {
  return (
    <section className="hero flex flex-col items-center justify-center px-4 py-24 text-center sm:py-32">
      <div className="hero-content flex flex-col items-center">
        {image && (
          <div className="mb-6 flex justify-center">
            <img
              src={image}
              alt=""
              className={`hero-image ${imageSizeClass[imageSize]} object-contain`}
            />
          </div>
        )}
        <h1 className="flex items-center justify-center gap-3 text-4xl font-bold tracking-tight sm:text-6xl">
          {logoImage && (
            <img src={logoImage} alt="" className="h-12 w-12 object-contain sm:h-14 sm:w-14" />
          )}
          {logoIcon && (
            <span className="text-5xl sm:text-6xl">{logoIcon}</span>
          )}
          {title}
        </h1>
        {tagline && (
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            {tagline}
          </p>
        )}
        {description && (
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            {description}
          </p>
        )}
        {(primaryCta || secondaryCta) && (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
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
