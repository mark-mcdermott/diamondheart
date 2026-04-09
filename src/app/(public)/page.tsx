import Link from "next/link";
import { Hero } from "@/components/blocks/hero";
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

      {/* Feature cards */}
      <section className="border-t border-border">
        <div className="container px-5 py-24 mx-auto max-w-5xl">
          <div className="flex flex-col text-center w-full mb-20">
            <h2 className="text-xs text-accent tracking-widest font-medium uppercase mb-1">Mindful Living</h2>
            <h1 className="sm:text-3xl text-2xl font-medium">Track What Matters Most</h1>
          </div>
          <div className="flex flex-wrap -m-4">
            {[
              { icon: Activity, title: "Daily Practice", description: "Build consistent meditation and wellness habits with gentle tracking that respects your journey." },
              { icon: Users, title: "Community", description: "Connect with like-minded practitioners and share your growth in a supportive, mindful space." },
              { icon: GitBranch, title: "Personal Growth", description: "Visualize your progress over time and discover patterns that deepen your self-awareness." },
            ].map((feature) => (
              <div key={feature.title} className="p-4 md:w-1/3">
                <div className="flex rounded-lg h-full bg-card p-8 flex-col">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 mr-3 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground flex-shrink-0">
                      <feature.icon className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-medium">{feature.title}</h2>
                  </div>
                  <div className="flex-grow">
                    <p className="leading-relaxed text-base">{feature.description}</p>
                    <Link href="/about" className="mt-3 text-accent inline-flex items-center">
                      Learn More
                      <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="w-4 h-4 ml-2" viewBox="0 0 24 24">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Image + features */}
      <section className="border-t border-border">
        <div className="container px-5 py-24 mx-auto max-w-5xl flex flex-wrap">
          <div className="lg:w-1/2 w-full mb-10 lg:mb-0 rounded-lg overflow-hidden">
            <img alt="Meditation practice" className="object-cover object-center h-full w-full rounded-lg" src="https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=600&fit=crop" />
          </div>
          <div className="flex flex-col flex-wrap lg:py-6 -mb-10 lg:w-1/2 lg:pl-12 lg:text-left text-center">
            {[
              { icon: Activity, title: "Meditation Tracking", description: "Log your sessions, set intentions, and watch your practice deepen over weeks and months." },
              { icon: GitBranch, title: "Habit Patterns", description: "Discover connections between your daily habits and overall wellbeing through intuitive visualizations." },
              { icon: Users, title: "Mindful Reminders", description: "Gentle nudges to help you stay present and connected to your practice throughout the day." },
            ].map((feature) => (
              <div key={feature.title} className="flex flex-col mb-10 lg:items-start items-center">
                <div className="w-12 h-12 inline-flex items-center justify-center rounded-full bg-secondary text-accent mb-5">
                  <feature.icon className="w-6 h-6" />
                </div>
                <div className="flex-grow">
                  <h2 className="text-lg font-medium mb-3">{feature.title}</h2>
                  <p className="leading-relaxed text-base">{feature.description}</p>
                  <Link href="/about" className="mt-3 text-accent inline-flex items-center">
                    Learn More
                    <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="w-4 h-4 ml-2" viewBox="0 0 24 24">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6-card grid */}
      <section className="border-t border-border">
        <div className="container px-5 py-24 mx-auto max-w-5xl">
          <div className="flex flex-wrap w-full mb-20 flex-col items-center text-center">
            <h1 className="sm:text-3xl text-2xl font-medium mb-2">Everything You Need</h1>
            <p className="lg:w-1/2 w-full leading-relaxed text-base">Simple, thoughtful tools to support your meditation practice and daily wellness journey.</p>
          </div>
          <div className="flex flex-wrap -m-4">
            {[
              { icon: Activity, title: "Session Logging", description: "Track meditation sessions with duration, type, and personal notes." },
              { icon: GitBranch, title: "Progress Insights", description: "Visualize your practice streaks and growth patterns over time." },
              { icon: Users, title: "Community Support", description: "Connect with practitioners who share your path and intentions." },
              { icon: Flag, title: "Goal Setting", description: "Set meaningful milestones for your meditation and wellness journey." },
              { icon: Moon, title: "Sleep & Rest", description: "Monitor your sleep patterns and their connection to your practice." },
              { icon: Shield, title: "Private & Secure", description: "Your personal data stays private with end-to-end encryption." },
            ].map((feature) => (
              <div key={feature.title} className="xl:w-1/3 md:w-1/2 p-4">
                <div className="bg-card p-6 rounded-lg">
                  <div className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-secondary text-accent mb-4">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h2 className="text-lg font-medium mb-2">{feature.title}</h2>
                  <p className="leading-relaxed text-base">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
