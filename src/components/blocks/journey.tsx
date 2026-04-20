"use client";

import { useEffect, useRef, useState } from "react";

interface JourneyPhase {
  numeral: string;
  title: string;
  body: string;
}

interface JourneyProps {
  eyebrow: string;
  headline: string;
  phases: JourneyPhase[];
}

export function Journey({ eyebrow, headline, phases }: JourneyProps) {
  const refs = useRef<Array<HTMLLIElement | null>>([]);
  const [visible, setVisible] = useState<Set<number>>(new Set());

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        setVisible((prev) => {
          const next = new Set(prev);
          for (const entry of entries) {
            if (entry.isIntersecting) {
              next.add(Number((entry.target as HTMLElement).dataset.index));
            }
          }
          return next;
        });
      },
      { threshold: 0.3 },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section className="journey-section">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="journey-header">
          <span className="journey-eyebrow">
            <span className="journey-eyebrow-dot" aria-hidden="true" />
            {eyebrow}
          </span>
          <h2 className="font-display journey-headline">{headline}</h2>
        </div>

        <ol className="journey-phases">
          {phases.map((phase, i) => (
            <li
              key={phase.title}
              ref={(el) => {
                refs.current[i] = el;
              }}
              data-index={i}
              className={`journey-phase ${visible.has(i) ? "is-visible" : ""}`}
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              <span className="journey-phase-numeral font-display">{phase.numeral}</span>
              <span className="journey-phase-rule" aria-hidden="true" />
              <h3 className="font-display journey-phase-title">{phase.title}</h3>
              <p className="journey-phase-body">{phase.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
