import Image from "next/image";

interface StoryProps {
  title: string;
  description: string;
  image?: string;
  imagePosition?: "left" | "right";
  children?: React.ReactNode;
}

export function Story({
  title,
  description,
  image,
  imagePosition = "right",
  children,
}: StoryProps) {
  const content = (
    <div className="flex flex-col justify-center gap-4">
      <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
      <p className="text-muted-foreground">{description}</p>
      {children}
    </div>
  );

  const imageEl = image ? (
    <div className="relative aspect-video overflow-hidden rounded-lg">
      <Image
        src={image}
        alt={title}
        fill
        className="object-cover"
      />
    </div>
  ) : null;

  return (
    <section className="px-4 py-16 sm:py-24">
      <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-2">
        {imagePosition === "left" ? (
          <>
            {imageEl}
            {content}
          </>
        ) : (
          <>
            {content}
            {imageEl}
          </>
        )}
      </div>
    </section>
  );
}
