import type { LucideIcon } from "lucide-react";

interface FeatureGridItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface FeatureGridProps {
  title?: string;
  description?: string;
  features: FeatureGridItem[];
  columns?: 2 | 3;
}

const colsClass = {
  2: "md:w-1/2",
  3: "xl:w-1/3 md:w-1/2",
};

export function FeatureGrid({
  title,
  description,
  features,
  columns = 3,
}: FeatureGridProps) {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-5xl px-5 py-24">
        {(title || description) && (
          <div className="flex flex-wrap w-full mb-20 flex-col items-center text-center">
            {title && (
              <h1 className="sm:text-3xl text-2xl font-medium mb-2">
                {title}
              </h1>
            )}
            {description && (
              <p className="lg:w-1/2 w-full leading-relaxed text-base">
                {description}
              </p>
            )}
          </div>
        )}
        <div className="flex flex-wrap -m-4">
          {features.map((feature) => (
            <div key={feature.title} className={`${colsClass[columns]} p-4`}>
              <div className="bg-card p-6 rounded-lg">
                <div className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-secondary text-accent mb-4">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-medium mb-2">{feature.title}</h2>
                <p className="leading-relaxed text-base">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
