import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "@/hooks/use-theme"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * The toaster is fixed to the viewport, so the page's safe-area padding never
 * reaches it: in the native shells a toast at the top sat under the notch.
 * Sonner's own gaps (24px, 16px on a narrow screen) are kept on top of the inset.
 */
const belowSafeArea = (gap: string) => ({ top: `calc(env(safe-area-inset-top, 0px) + ${gap})` });

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      offset={belowSafeArea("24px")}
      mobileOffset={belowSafeArea("16px")}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--app-card)",
          "--normal-text": "var(--app-foreground)",
          "--normal-border": "var(--app-border)",
          "--success-bg": "var(--app-success)",
          "--success-text": "var(--app-success-foreground)",
          "--error-bg": "var(--app-destructive)",
          "--error-text": "var(--app-destructive-foreground)",
          "--border-radius": "var(--app-radius)",
          fontFamily: "'Outfit', system-ui, sans-serif",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
