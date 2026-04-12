import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface FeatureCard {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
}

interface FeatureCardsProps {
  title?: string;
  subtitle?: string;
  features: FeatureCard[];
}

export function FeatureCards({ title, subtitle, features }: FeatureCardsProps) {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-5xl px-5 py-24">
        {(title || subtitle) && (
          <div className="flex flex-col text-center w-full mb-16">
            {subtitle && (
              <p className="text-xs text-primary tracking-widest font-medium uppercase mb-3" style={{ letterSpacing: "0.12em" }}>
                {subtitle}
              </p>
            )}
            {title && (
              <h2 className="font-display sm:text-3xl text-2xl" style={{ fontWeight: 500 }}>{title}</h2>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 stagger-children">
          {features.map((feature) => (
            <div key={feature.title} className="bg-card rounded-2xl border border-border p-7 card-texture transition-all duration-300 hover:border-primary/30 hover:shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 inline-flex items-center justify-center rounded-xl bg-primary/10 text-primary flex-shrink-0">
                  <feature.icon className="w-5 h-5" strokeWidth={1.8} />
                </div>
                <h3 className="text-base font-semibold">{feature.title}</h3>
              </div>
              <p className="leading-relaxed text-sm text-muted-foreground mb-4">
                {feature.description}
              </p>
              {feature.href && (
                <Link
                  href={feature.href}
                  className="text-sm text-primary font-medium inline-flex items-center gap-1 hover:gap-2 transition-all duration-200 no-underline"
                >
                  {feature.linkLabel || "Learn More"}
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
