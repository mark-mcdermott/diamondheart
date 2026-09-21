import { useEffect, useRef, useState } from "react";

interface ManifestoProps {
  eyebrow: string;
  lead: string;
  body: string;
}

export function Manifesto({ eyebrow, lead, body }: ManifestoProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { threshold: 0.25 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="manifesto-section relative overflow-hidden"
      aria-labelledby="manifesto-lead"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-x-12 gap-y-8 px-6 py-32 md:grid-cols-12 md:py-40">
        <div className="md:col-span-4">
          <span
            className={`manifesto-eyebrow ${visible ? "is-visible" : ""}`}
            style={{ transitionDelay: "0ms" }}
          >
            <span className="manifesto-eyebrow-dot" aria-hidden="true" />
            {eyebrow}
          </span>
        </div>
        <div className="md:col-span-8">
          <h2
            id="manifesto-lead"
            className={`font-display manifesto-lead ${visible ? "is-visible" : ""}`}
            style={{ transitionDelay: "120ms" }}
          >
            {lead}
          </h2>
          <p
            className={`manifesto-body ${visible ? "is-visible" : ""}`}
            style={{ transitionDelay: "320ms" }}
          >
            {body}
          </p>
        </div>
      </div>
    </section>
  );
}
