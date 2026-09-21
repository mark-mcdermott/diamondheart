import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { $theme, applyTheme, readTheme, resolveTheme, setTheme, type ResolvedTheme, type Theme } from "@/lib/theme";

/**
 * The theme hook, on the nanostore: `theme` is the choice,
 * `resolvedTheme` what is on screen. Islands each have their own React root,
 * and the store is what keeps the toggle in the nav and the toaster agreeing.
 */
export function useTheme(): { theme: Theme; resolvedTheme: ResolvedTheme; setTheme: (theme: Theme) => void } {
  const theme = useStore($theme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const stored = readTheme();
    if (stored !== $theme.get()) $theme.set(stored);
    setResolvedTheme(applyTheme(stored));
  }, []);

  useEffect(() => {
    setResolvedTheme(resolveTheme(theme));
    if (theme !== "system") return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolvedTheme(applyTheme("system"));
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  return { theme, resolvedTheme, setTheme };
}
