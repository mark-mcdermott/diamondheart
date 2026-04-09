interface Section {
  id: string;
  title: string;
  content: string | string[];
}

interface StripedSectionsProps {
  sections: Section[];
  maxWidth?: string;
}

export function StripedSections({ sections, maxWidth = "max-w-4xl" }: StripedSectionsProps) {
  return (
    <div>
      {sections.map((section, i) => {
        const paragraphs = Array.isArray(section.content)
          ? section.content
          : [section.content];

        return (
          <section
            key={section.id}
            id={section.id}
            className={`scroll-mt-20 py-20 px-4 ${i % 2 === 1 ? "bg-muted" : ""}`}
          >
            <div className={`mx-auto ${maxWidth}`}>
              <h2 className="text-3xl font-bold tracking-tight mb-6">
                {section.title}
              </h2>
              {paragraphs.map((p, j) => (
                <p
                  key={j}
                  className={`text-lg text-muted-foreground ${
                    j < paragraphs.length - 1 ? "mb-4" : ""
                  }`}
                >
                  {p}
                </p>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
