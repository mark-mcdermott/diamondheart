import { Hero } from "@/components/blocks/hero";

export default function HomePage() {
  return (
    <Hero
      title="Diamondheart"
      description="Track what matters and build better habits. Workouts, nutrition, custom metrics — all in one place."
      primaryCta={{ label: "Get Started", href: "/signup" }}
      secondaryCta={{ label: "Learn More", href: "/about" }}
    />
  );
}
