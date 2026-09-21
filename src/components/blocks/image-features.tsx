import { Link } from "@/app/link";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ImageFeature {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
}

interface ImageFeaturesProps {
  image: string;
  imageAlt?: string;
  imagePosition?: "left" | "right";
  features: ImageFeature[];
}

export function ImageFeatures({
  image,
  imageAlt = "",
  imagePosition = "left",
  features,
}: ImageFeaturesProps) {
  const imageEl = (
    <div className="lg:w-1/2 w-full mb-10 lg:mb-0 rounded-2xl overflow-hidden">
      <img
        alt={imageAlt}
        className="object-cover object-center h-full w-full rounded-2xl"
        src={image}
      />
    </div>
  );

  const featuresEl = (
    <div
      className={`flex flex-col flex-wrap lg:py-6 -mb-10 w-full lg:w-1/2 lg:text-left text-center ${
        imagePosition === "left" ? "lg:pl-12" : "lg:pr-12"
      }`}
    >
      {features.map((feature, i) => (
        <div
          key={feature.title}
          className="flex flex-col mb-10 lg:items-start items-center fade-section"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="w-12 h-12 inline-flex items-center justify-center rounded-xl bg-primary/10 text-primary mb-5">
            <feature.icon className="w-6 h-6" strokeWidth={1.8} />
          </div>
          <div className="flex-grow">
            <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
            <p className="leading-relaxed text-sm text-muted-foreground">{feature.description}</p>
            {feature.href && (
              <Link
                href={feature.href}
                className="mt-3 text-sm text-primary font-medium inline-flex items-center gap-1 hover:gap-2 transition-all duration-200 no-underline"
              >
                {feature.linkLabel || "Learn More"}
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-5xl px-5 py-24 flex flex-wrap">
        {imagePosition === "left" ? (
          <>
            {imageEl}
            {featuresEl}
          </>
        ) : (
          <>
            {featuresEl}
            {imageEl}
          </>
        )}
      </div>
    </section>
  );
}
