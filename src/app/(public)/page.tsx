import { Hero } from "@/components/blocks/hero";
import { FeatureCards } from "@/components/blocks/feature-cards";
import { ImageFeatures } from "@/components/blocks/image-features";
import { FeatureGrid } from "@/components/blocks/feature-grid";
import { Activity, Users, GitBranch, Flag, Moon, Shield } from "lucide-react";

export default function HomePage() {
  return (
    <>
      <Hero
        title="Diamondheart"
        logoImage="/logo.png"
        description="Mindful tracking for meditation, wellness, and daily habits."
        backgroundImage="/background.png"
        primaryCta={{ label: "Get Started", href: "/signup" }}
        secondaryCta={{ label: "Learn More", href: "/about" }}
      />

      <FeatureCards
        title="Track What Matters Most"
        subtitle="Mindful Living"
        features={[
          { icon: Activity, title: "Daily Practice", description: "Build consistent meditation and wellness habits with gentle tracking that respects your journey.", href: "/about" },
          { icon: Users, title: "Community", description: "Connect with like-minded practitioners and share your growth in a supportive, mindful space.", href: "/about" },
          { icon: GitBranch, title: "Personal Growth", description: "Visualize your progress over time and discover patterns that deepen your self-awareness.", href: "/about" },
        ]}
      />

      <ImageFeatures
        image="https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=600&fit=crop"
        imageAlt="Meditation practice"
        features={[
          { icon: Activity, title: "Meditation Tracking", description: "Log your sessions, set intentions, and watch your practice deepen over weeks and months.", href: "/about" },
          { icon: GitBranch, title: "Habit Patterns", description: "Discover connections between your daily habits and overall wellbeing through intuitive visualizations.", href: "/about" },
          { icon: Users, title: "Mindful Reminders", description: "Gentle nudges to help you stay present and connected to your practice throughout the day.", href: "/about" },
        ]}
      />

      <FeatureGrid
        title="Everything You Need"
        description="Simple, thoughtful tools to support your meditation practice and daily wellness journey."
        features={[
          { icon: Activity, title: "Session Logging", description: "Track meditation sessions with duration, type, and personal notes." },
          { icon: GitBranch, title: "Progress Insights", description: "Visualize your practice streaks and growth patterns over time." },
          { icon: Users, title: "Community Support", description: "Connect with practitioners who share your path and intentions." },
          { icon: Flag, title: "Goal Setting", description: "Set meaningful milestones for your meditation and wellness journey." },
          { icon: Moon, title: "Sleep & Rest", description: "Monitor your sleep patterns and their connection to your practice." },
          { icon: Shield, title: "Private & Secure", description: "Your personal data stays private with end-to-end encryption." },
        ]}
      />
    </>
  );
}
