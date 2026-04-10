import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMeditationStyles, getMeditationPresets, seedMeditationDefaults, getDefaultTimerSeconds } from "@/app/actions/meditation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MeditateEditClient } from "./edit-client";

export default async function MeditateEditPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  let [styles, presets, defaultTimerSeconds] = await Promise.all([
    getMeditationStyles(session.userId),
    getMeditationPresets(session.userId),
    getDefaultTimerSeconds(session.userId),
  ]);

  if (styles.length === 0 || presets.length === 0) {
    await seedMeditationDefaults(session.userId, styles.length === 0, presets.length === 0);
    [styles, presets] = await Promise.all([
      getMeditationStyles(session.userId),
      getMeditationPresets(session.userId),
    ]);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/meditate" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2>Edit Meditation</h2>
          <p className="text-muted-foreground mt-1">Customize your styles and timer presets</p>
        </div>
      </div>
      <MeditateEditClient styles={styles} presets={presets} defaultTimerSeconds={defaultTimerSeconds} />
    </div>
  );
}
