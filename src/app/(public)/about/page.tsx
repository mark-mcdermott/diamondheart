import { Blurb } from "@/components/blocks/blurb";
import { Features } from "@/components/blocks/features";
import { Activity, Dumbbell, Apple, Heart, Bell, ShoppingBag } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="py-16">
      <Blurb
        title="About Diamondheart"
        description="A personal health and productivity platform designed to track what matters and build better habits."
      />
      <Features
        columns={3}
        features={[
          {
            icon: Activity,
            title: "Custom Metrics",
            description: "Track any metric that matters to you with daily goals and progress visualization.",
          },
          {
            icon: Dumbbell,
            title: "Workout Logging",
            description: "Log strength training sessions with automatic personal record detection.",
          },
          {
            icon: Apple,
            title: "Nutrition Tracking",
            description: "Search the USDA database, log meals, save favorites, and track your macros.",
          },
          {
            icon: Heart,
            title: "Biometric Sync",
            description: "Connect Oura Ring and Apple HealthKit for automatic health data tracking.",
          },
          {
            icon: Bell,
            title: "Smart Reminders",
            description: "Schedule notifications per metric to keep your habits on track.",
          },
          {
            icon: ShoppingBag,
            title: "Merch Store",
            description: "Print-on-demand merchandise powered by Stripe and Printful.",
          },
        ]}
      />
    </div>
  );
}
