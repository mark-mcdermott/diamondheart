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
  backgroundImage?: string;
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
  backgroundImage,
}: HeroProps) {
  return (
    <section
      className={`hero relative flex flex-col items-center justify-start px-4 pt-32 pb-12 text-center sm:pt-40 sm:pb-20 ${backgroundImage ? "hero-with-bg" : ""}`}
      style={backgroundImage ? { "--hero-bg-url": `url(${backgroundImage})` } as React.CSSProperties : undefined}
    >
      <div className="hero-content relative z-10 flex flex-col items-center">
        {image && (
          <div className="mb-8 flex justify-center" style={{ animation: "fade-in-up 0.8s var(--ease-settle) backwards", animationDelay: "100ms", transform: "translateY(2rem)" }}>
            <img
              src={image}
              alt=""
              className={`hero-image ${imageSizeClass[imageSize]} object-contain`}
            />
          </div>
        )}
        {logoImage && (
          <div className="mb-8 flex justify-center" style={{ animation: "fade-in-up 0.8s var(--ease-settle) backwards", animationDelay: "100ms" }}>
            <img src={logoImage} alt="" className="hero-logo h-48 w-48 object-contain sm:h-56 sm:w-56 drop-shadow-lg" />
          </div>
        )}
        {logoIcon && (
          <div className="mb-8 flex justify-center" style={{ animation: "fade-in-up 0.8s var(--ease-settle) backwards", animationDelay: "100ms" }}>
            <span className="text-5xl sm:text-6xl">{logoIcon}</span>
          </div>
        )}
        <h1
          className="font-display text-4xl font-semibold tracking-tight sm:text-6xl"
          style={{
            color: "var(--app-heading-color)",
            animation: "fade-in-up 0.8s var(--ease-settle) backwards",
            animationDelay: "250ms",
          }}
        >
          {title}
        </h1>
        {tagline && (
          <p
            className="mt-5 max-w-2xl text-lg text-muted-foreground"
            style={{ animation: "fade-in-up 0.8s var(--ease-settle) backwards", animationDelay: "350ms" }}
          >
            {tagline}
          </p>
        )}
        {description && (
          <p
            className="mt-5 max-w-md text-lg text-muted-foreground leading-relaxed"
            style={{ animation: "fade-in-up 0.8s var(--ease-settle) backwards", animationDelay: "350ms" }}
          >
            {description}
          </p>
        )}
        {(primaryCta || secondaryCta) && (
          <div
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
            style={{ animation: "fade-in-up 0.8s var(--ease-settle) backwards", animationDelay: "500ms" }}
          >
            {primaryCta && (
              <Button asChild size="lg">
                <Link href={primaryCta.href}>{primaryCta.label}</Link>
              </Button>
            )}
            {secondaryCta && (
              <Button asChild variant="secondary" size="lg">
                <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
