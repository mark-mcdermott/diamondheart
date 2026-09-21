import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DatePickerCalendarProps {
  value: string;
  max?: string;
  onChange: (dateISO: string) => void;
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DatePickerCalendar({ value, max, onChange }: DatePickerCalendarProps) {
  const [year, month] = value.split("-").map(Number);
  const [viewYear, setViewYear] = useState(year);
  const [viewMonth, setViewMonth] = useState(month - 1);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const maxDate = max ? new Date(max + "T00:00:00") : null;

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  function selectDay(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    if (maxDate && d > maxDate) return;
    onChange(toISO(d));
  }

  function goToday() {
    const now = new Date();
    onChange(toISO(now));
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayISO = toISO(new Date());

  return (
    <div className="w-[260px] select-none">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1 rounded-lg hover:bg-secondary transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1 rounded-lg hover:bg-secondary transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const iso = toISO(new Date(viewYear, viewMonth, day));
          const isSelected = iso === value;
          const isToday = iso === todayISO;
          const isDisabled = maxDate && new Date(viewYear, viewMonth, day) > maxDate;

          return (
            <button
              key={day}
              type="button"
              disabled={!!isDisabled}
              onClick={() => selectDay(day)}
              className={`
                h-8 w-full rounded-lg text-sm transition-colors cursor-pointer
                disabled:opacity-30 disabled:cursor-default
                ${isSelected
                  ? "bg-primary text-primary-foreground font-semibold"
                  : isToday
                    ? "border border-primary/40 font-medium"
                    : "hover:bg-secondary"
                }
              `}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between mt-2 pt-2 border-t border-border">
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={goToday}
          className="text-xs font-medium cursor-pointer"
          style={{ color: "var(--app-primary)" }}
        >
          Today
        </button>
      </div>
    </div>
  );
}
