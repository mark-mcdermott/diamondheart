import Link from "next/link";
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
          <div className="flex flex-col text-center w-full mb-20">
            {subtitle && (
              <h2 className="text-xs text-accent tracking-widest font-medium uppercase mb-1">
                {subtitle}
              </h2>
            )}
            {title && (
              <h1 className="sm:text-3xl text-2xl font-medium">{title}</h1>
            )}
          </div>
        )}
        <div className="flex flex-wrap -m-4">
          {features.map((feature) => (
            <div key={feature.title} className="p-4 md:w-1/3">
              <div className="flex rounded-lg h-full bg-card p-8 flex-col">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 mr-3 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground flex-shrink-0">
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-medium">{feature.title}</h2>
                </div>
                <div className="flex-grow">
                  <p className="leading-relaxed text-base">
                    {feature.description}
                  </p>
                  {feature.href && (
                    <Link
                      href={feature.href}
                      className="mt-3 text-accent inline-flex items-center"
                    >
                      {feature.linkLabel || "Learn More"}
                      <svg
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        className="w-4 h-4 ml-2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
