import type { LucideIcon } from "lucide-react";

interface Feature {
  icon?: LucideIcon;
  title: string;
  description: string;
}

interface FeaturesProps {
  title?: string;
  features: Feature[];
  columns?: 2 | 3 | 4;
}

const colsClass = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

export function Features({ title, features, columns = 3 }: FeaturesProps) {
  return (
    <section className="px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-5xl">
        {title && (
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight">
            {title}
          </h2>
        )}
        <div className={`grid gap-8 ${colsClass[columns]}`}>
          {features.map((feature, i) => (
            <div key={i} className="flex flex-col gap-3">
              {feature.icon && (
                <feature.icon className="h-8 w-8 text-primary" />
              )}
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
