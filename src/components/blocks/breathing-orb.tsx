import { useEffect, useState } from "react";

type Phase = "in" | "hold" | "out";

const SCHEDULE: Array<{ phase: Phase; duration: number }> = [
  { phase: "in", duration: 4000 },
  { phase: "hold", duration: 4000 },
  { phase: "out", duration: 6000 },
];

const LABELS: Record<Phase, string> = {
  in: "Breathe in",
  hold: "Hold",
  out: "Breathe out",
};

export function BreathingOrb() {
  const [phase, setPhase] = useState<Phase>("in");

  useEffect(() => {
    let index = 0;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const step = SCHEDULE[index];
      setPhase(step.phase);
      timer = setTimeout(() => {
        index = (index + 1) % SCHEDULE.length;
        tick();
      }, step.duration);
    };

    tick();
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="breathing-orb" data-phase={phase} aria-hidden="true">
      <div className="breathing-orb-glow" />
      <div className="breathing-orb-ring breathing-orb-ring-outer" />
      <div className="breathing-orb-ring breathing-orb-ring-mid" />
      <div className="breathing-orb-ring breathing-orb-ring-inner" />
      <div className="breathing-orb-core">
        <span className="breathing-orb-label">{LABELS[phase]}</span>
      </div>
    </div>
  );
}
