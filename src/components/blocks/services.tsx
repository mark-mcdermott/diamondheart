import type { LucideIcon } from "lucide-react";

interface Service {
  icon?: LucideIcon;
  title: string;
  description: string;
}

interface ServicesProps {
  title?: string;
  services: Service[];
  columns?: 2 | 3 | 4;
}

const colsClass = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

export function Services({ title, services, columns = 3 }: ServicesProps) {
  return (
    <section className="px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-5xl">
        {title && (
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight">
            {title}
          </h2>
        )}
        <div className={`grid gap-8 ${colsClass[columns]}`}>
          {services.map((service, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card p-6 transition-shadow hover:shadow-md"
            >
              {service.icon && (
                <service.icon className="mb-4 h-8 w-8 text-primary" />
              )}
              <h3 className="mb-2 text-lg font-semibold">{service.title}</h3>
              <p className="text-sm text-muted-foreground">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
