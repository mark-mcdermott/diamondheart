"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  function cycle() {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  }

  const Icon = !mounted
    ? Sun
    : theme === "system"
      ? Monitor
      : resolvedTheme === "dark"
        ? Moon
        : Sun;

  const label = !mounted
    ? "Toggle theme"
    : `Current theme: ${theme}. Click to switch.`;

  return (
    <button
      type="button"
      onClick={cycle}
      className="theme-toggle flex items-center justify-center w-8 h-8 rounded-[8px] transition-colors hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
      title={`Theme: ${mounted ? theme : "system"}`}
      aria-label={label}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
