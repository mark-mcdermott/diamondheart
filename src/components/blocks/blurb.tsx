interface BlurbProps {
  title: string;
  description: string;
}

export function Blurb({ title, description }: BlurbProps) {
  return (
    <section className="px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-4xl font-bold tracking-tight mb-4">{title}</h2>
        <p className="text-lg text-muted-foreground">{description}</p>
      </div>
    </section>
  );
}
