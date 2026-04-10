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
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 xl:grid-cols-3",
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
          <div className="flex flex-col items-center text-center mb-16">
            {title && (
              <h2 className="font-display sm:text-3xl text-2xl mb-3" style={{ fontWeight: 500 }}>
                {title}
              </h2>
            )}
            {description && (
              <p className="lg:w-1/2 w-full leading-relaxed text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        )}
        <div className={`grid grid-cols-1 ${colsClass[columns]} gap-4 stagger-children`}>
          {features.map((feature) => (
            <div key={feature.title} className="bg-card rounded-2xl border border-border p-6 card-texture transition-all duration-300 hover:border-primary/30">
              <div className="w-10 h-10 inline-flex items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                <feature.icon className="w-5 h-5" strokeWidth={1.8} />
              </div>
              <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
              <p className="leading-relaxed text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
