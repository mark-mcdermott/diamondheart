"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { DatePickerCalendar } from "@/components/ui/date-picker-calendar";
import { useViewRange } from "@/lib/use-view-range";
import {
  isCurrentPeriod,
  parseAnchorDate,
  shiftAnchor,
  toISODateAnchor,
  viewRangeLabel,
} from "@/lib/view-range";

interface DateNavigatorProps {
  className?: string;
}

/**
 * [‹] [label ▾] [›] — prev/next step by one view-width, label is a popover
 * trigger for a full calendar pick. Stepping forward past the current period
 * clears the anchor (returns to live); next button is disabled when already
 * live or viewing a future-inclusive period.
 */
export function DateNavigator({ className }: DateNavigatorProps) {
  const { view, anchor, setAnchor } = useViewRange();
  const [calOpen, setCalOpen] = useState(false);
  const effective = anchor ?? new Date();
  const isLive = isCurrentPeriod(view, effective);

  const onPrev = () => setAnchor(shiftAnchor(view, effective, -1));
  const onNext = () => {
    if (isLive) return;
    const next = shiftAnchor(view, effective, 1);
    setAnchor(isCurrentPeriod(view, next) ? null : next);
  };
  const onPick = (iso: string) => {
    const picked = parseAnchorDate(iso);
    if (!picked) return;
    setAnchor(isCurrentPeriod(view, picked) ? null : picked);
    setCalOpen(false);
  };

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous period"
        className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <Popover open={calOpen} onOpenChange={setCalOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="px-2 py-1 text-sm font-medium rounded-md text-foreground hover:bg-secondary transition-colors cursor-pointer min-w-[7rem] text-center"
          >
            {viewRangeLabel(view, anchor)}
          </button>
        </PopoverTrigger>
        <PopoverContent align="center" sideOffset={8} className="p-0 w-auto">
          <DatePickerCalendar
            value={toISODateAnchor(effective)}
            max={toISODateAnchor(new Date())}
            onChange={onPick}
          />
        </PopoverContent>
      </Popover>
      <button
        type="button"
        onClick={onNext}
        disabled={isLive}
        aria-label="Next period"
        className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
