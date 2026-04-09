interface CalloutNumberedItem {
  title: string;
  description: string;
}

interface CalloutNumberedProps {
  title?: string;
  items: CalloutNumberedItem[];
  columns?: 2 | 3 | 4;
}

const colsClass = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

export function CalloutNumbered({ title, items, columns = 4 }: CalloutNumberedProps) {
  return (
    <section className="px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-5xl">
        {title && (
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight">
            {title}
          </h2>
        )}
        <div className={`grid gap-8 ${colsClass[columns]}`}>
          {items.map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                {i + 1}
              </div>
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
