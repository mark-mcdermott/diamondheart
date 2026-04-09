import type { LucideIcon } from "lucide-react";

interface CalloutItem {
  icon?: LucideIcon;
  title: string;
  description: string;
}

interface CalloutGridProps {
  items: CalloutItem[];
  columns?: 2 | 3;
}

export function CalloutGrid({ items, columns = 3 }: CalloutGridProps) {
  const cols = columns === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  return (
    <section className="px-4 py-16">
      <div className={`mx-auto max-w-5xl grid gap-6 ${cols}`}>
        {items.map((item, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-6">
            {item.icon && <item.icon className="mb-3 h-6 w-6 text-primary" />}
            <h3 className="mb-2 font-semibold">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
