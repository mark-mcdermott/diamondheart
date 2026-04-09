import { Prose } from "@/components/ui/prose";

export default function AboutPage() {
  return (
    <div className="px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <div className="bg-card rounded-2xl border border-border p-8 sm:p-12">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl text-primary" style={{ marginBottom: "2rem" }}>About</h1>
          <Prose>
            <p>
              Diamondheart is a mindful wellness platform built for people who want to
              deepen their meditation practice, build meaningful daily habits, and take
              a more intentional approach to their well-being.
            </p>

            <h2>Why Diamondheart?</h2>
            <p>
              Most tracking apps are built around productivity and optimization.
              Diamondheart is different — it&apos;s built around presence. The goal
              isn&apos;t to squeeze more out of your day, but to become more aware of
              how you&apos;re living it.
            </p>

            <h2>What you can track</h2>
            <p>
              Diamondheart supports meditation sessions, daily habits, custom wellness
              metrics, nutrition, workouts, and biometric data from devices like the
              Oura Ring and Apple HealthKit. Everything lives in one place, giving you
              a clear picture of your overall well-being.
            </p>

            <h2>How it works</h2>
            <p>
              Log what matters to you. Set gentle reminders. Watch your streaks grow.
              Over time, patterns emerge — you&apos;ll start to see how your sleep,
              movement, meditation, and mood connect. No judgment, no gamification,
              just honest reflection.
            </p>

            <h2>Built with care</h2>
            <p>
              Diamondheart is designed and built by{" "}
              <a href="https://markmcdermott.io" target="_blank" rel="noopener noreferrer">
                Mark McDermott
              </a>{" "}
              in Austin, Texas. Your data stays private and secure — that&apos;s not
              negotiable.
            </p>
          </Prose>
        </div>
      </div>
    </div>
  );
}
