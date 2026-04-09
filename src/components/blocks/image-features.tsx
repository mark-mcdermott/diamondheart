import Link from "next/link";
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
    <div className="lg:w-1/2 w-full mb-10 lg:mb-0 rounded-lg overflow-hidden">
      <img
        alt={imageAlt}
        className="object-cover object-center h-full w-full rounded-lg"
        src={image}
      />
    </div>
  );

  const featuresEl = (
    <div
      className={`flex flex-col flex-wrap lg:py-6 -mb-10 lg:w-1/2 lg:text-left text-center ${
        imagePosition === "left" ? "lg:pl-12" : "lg:pr-12"
      }`}
    >
      {features.map((feature) => (
        <div
          key={feature.title}
          className="flex flex-col mb-10 lg:items-start items-center"
        >
          <div className="w-12 h-12 inline-flex items-center justify-center rounded-full bg-secondary text-accent mb-5">
            <feature.icon className="w-6 h-6" />
          </div>
          <div className="flex-grow">
            <h2 className="text-lg font-medium mb-3">{feature.title}</h2>
            <p className="leading-relaxed text-base">{feature.description}</p>
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
