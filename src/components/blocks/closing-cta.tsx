"use client";

import { Link } from "@/app/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface ClosingCtaProps {
  eyebrow: string;
  headline: string;
  body: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
}

export function ClosingCta({
  eyebrow,
  headline,
  body,
  primaryCta,
  secondaryCta,
}: ClosingCtaProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { threshold: 0.25 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="closing-cta-section">
      <div className="closing-cta-aura" aria-hidden="true" />
      <div className="mx-auto max-w-4xl px-6 py-28 text-center md:py-36">
        <span className={`closing-cta-eyebrow ${visible ? "is-visible" : ""}`}>
          <span className="closing-cta-eyebrow-dot" aria-hidden="true" />
          {eyebrow}
        </span>
        <h2
          className={`font-display closing-cta-headline ${visible ? "is-visible" : ""}`}
          style={{ transitionDelay: "120ms" }}
        >
          {headline}
        </h2>
        <p
          className={`closing-cta-body ${visible ? "is-visible" : ""}`}
          style={{ transitionDelay: "260ms" }}
        >
          {body}
        </p>
        <div
          className={`closing-cta-actions ${visible ? "is-visible" : ""}`}
          style={{ transitionDelay: "400ms" }}
        >
          <Button asChild size="lg">
            <Link href={primaryCta.href}>{primaryCta.label}</Link>
          </Button>
          {secondaryCta && (
            <Button asChild variant="outline" size="lg" className="closing-cta-secondary">
              <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
