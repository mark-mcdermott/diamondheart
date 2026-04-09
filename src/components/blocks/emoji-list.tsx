interface EmojiListItem {
  icon: string;
  title: string;
  description: string;
}

interface EmojiListProps {
  title?: string;
  items: EmojiListItem[];
}

export function EmojiList({ title, items }: EmojiListProps) {
  return (
    <section className="px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-3xl">
        {title && (
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight">
            {title}
          </h2>
        )}
        <div className="space-y-6">
          {items.map((item, i) => (
            <div key={i} className="flex gap-4">
              <span className="text-2xl shrink-0">{item.icon}</span>
              <div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p
                  className="text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: item.description }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
