import { Blurb } from "@/components/blocks/blurb";
import { Features } from "@/components/blocks/features";
import { Activity, Flame, Moon, Heart, Bell, BarChart3 } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="py-16">
      <Blurb
        title="About Diamondheart"
        description="A mindful wellness platform for tracking meditation, building daily habits, and nurturing your well-being."
      />
      <Features
        columns={3}
        features={[
          {
            icon: Moon,
            title: "Meditation Tracking",
            description: "Log meditation sessions, track streaks, and watch your practice grow over time.",
          },
          {
            icon: Flame,
            title: "Daily Habits",
            description: "Build and maintain habits with streak tracking, reminders, and progress visualization.",
          },
          {
            icon: Activity,
            title: "Custom Metrics",
            description: "Track any metric that matters to you — mood, sleep, gratitude, or anything else.",
          },
          {
            icon: Heart,
            title: "Biometric Sync",
            description: "Connect Oura Ring and Apple HealthKit for automatic health data tracking.",
          },
          {
            icon: Bell,
            title: "Mindful Reminders",
            description: "Gentle scheduled reminders to meditate, journal, or check in with yourself.",
          },
          {
            icon: BarChart3,
            title: "Wellness Insights",
            description: "See patterns in your practice and well-being with clear, simple charts.",
          },
        ]}
      />
    </div>
  );
}
