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
      className={`hero relative flex flex-col items-center justify-start px-4 pt-[10vh] pb-12 text-center ${backgroundImage ? "hero-with-bg" : ""}`}
      style={backgroundImage ? { "--hero-bg-url": `url(${backgroundImage})` } as React.CSSProperties : undefined}
    >
      <div className="hero-content relative z-10 flex flex-col items-center">
        {image && (
          <div className="mb-4 flex justify-center" style={{ animation: "mascot-enter 0.8s var(--ease-settle) both", animationDelay: "100ms" }}>
            <img
              src={image}
              alt=""
              className={`hero-image ${imageSizeClass[imageSize]} object-contain`}
              style={{
                animation: "mascot-float 4s ease-in-out 15s infinite",
                opacity: 0.95,
                filter: "drop-shadow(0 10px 26px rgba(11, 11, 12, 0.16)) drop-shadow(0 3px 10px rgba(11, 11, 12, 0.08))",
              }}
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
              <Button asChild size="lg" className="hover:!bg-[#e86529] hover:!brightness-100">
                <Link href={primaryCta.href}>{primaryCta.label}</Link>
              </Button>
            )}
            {secondaryCta && (
              <Button asChild variant="outline" size="lg" className="bg-white/15 backdrop-blur-[3px] text-[#9A4F2E] border-[rgba(154,79,46,0.6)] transition-all hover:bg-[rgba(154,79,46,0.10)] hover:text-[#B5622F] hover:border-[rgba(154,79,46,0.75)]">
                <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
