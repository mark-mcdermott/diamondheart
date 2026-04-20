"use client";

import { ViewToggle } from "@/components/ui/view-toggle";
import { useViewRange } from "@/lib/use-view-range";

export function MeditateViewToggle() {
  const { view, setView } = useViewRange("day");
  return <ViewToggle value={view} onChange={setView} />;
}
