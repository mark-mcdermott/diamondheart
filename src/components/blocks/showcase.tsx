import { useEffect, useRef, useState } from "react";
import { BreathingOrb } from "./breathing-orb";

interface ShowcaseBeat {
  numeral: string;
  kicker: string;
  heading: string;
  body: string;
}

interface ShowcaseProps {
  eyebrow: string;
  beats: ShowcaseBeat[];
}

export function Showcase({ eyebrow, beats }: ShowcaseProps) {
  const refs = useRef<Array<HTMLLIElement | null>>([]);
  const [visible, setVisible] = useState<Set<number>>(new Set());

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        setVisible((prev) => {
          const next = new Set(prev);
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const idx = Number((entry.target as HTMLElement).dataset.index);
              next.add(idx);
            }
          }
          return next;
        });
      },
      { threshold: 0.35 },
    );

    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section className="showcase-section relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 py-24 lg:grid-cols-12 lg:py-32">
        <div className="lg:col-span-5">
          <div className="showcase-sticky">
            <span className="showcase-eyebrow">
              <span className="showcase-eyebrow-dot" aria-hidden="true" />
              {eyebrow}
            </span>
            <div className="showcase-orb-wrap">
              <BreathingOrb />
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <ol className="showcase-beats">
            {beats.map((beat, i) => (
              <li
                key={beat.heading}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                data-index={i}
                className={`showcase-beat ${visible.has(i) ? "is-visible" : ""}`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="showcase-beat-head">
                  <span className="showcase-beat-numeral font-display">{beat.numeral}</span>
                  <span className="showcase-beat-rule" aria-hidden="true" />
                  <span className="showcase-beat-kicker">{beat.kicker}</span>
                </div>
                <h3 className="font-display showcase-beat-heading">{beat.heading}</h3>
                <p className="showcase-beat-body">{beat.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
