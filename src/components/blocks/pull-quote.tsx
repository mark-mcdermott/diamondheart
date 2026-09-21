import { useEffect, useRef, useState } from "react";

interface PullQuoteProps {
  quote: string;
  caption?: string;
}

export function PullQuote({ quote, caption }: PullQuoteProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { threshold: 0.4 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="pullquote-section">
      <div className="mx-auto max-w-4xl px-6 py-28 text-center md:py-36">
        <span
          className={`pullquote-ornament ${visible ? "is-visible" : ""}`}
          aria-hidden="true"
        >
          <span />
          <span />
          <span />
        </span>
        <blockquote
          className={`font-display pullquote-quote ${visible ? "is-visible" : ""}`}
          style={{ transitionDelay: "120ms" }}
        >
          <span className="pullquote-mark" aria-hidden="true">
            &ldquo;
          </span>
          {quote}
          <span className="pullquote-mark pullquote-mark-close" aria-hidden="true">
            &rdquo;
          </span>
        </blockquote>
        {caption && (
          <p
            className={`pullquote-caption ${visible ? "is-visible" : ""}`}
            style={{ transitionDelay: "260ms" }}
          >
            {caption}
          </p>
        )}
      </div>
    </section>
  );
}
