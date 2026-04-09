import { Hero } from "@/components/blocks/hero";

export default function HomePage() {
  return (
    <Hero
      title="Diamondheart"
      logoImage="/logo.png"
      description="Mindful tracking for meditation, wellness, and daily habits."
      backgroundImage="/background.png"
      primaryCta={{ label: "Get Started", href: "/signup" }}
      secondaryCta={{ label: "Learn More", href: "/about" }}
    />
  );
}
