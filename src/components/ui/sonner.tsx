import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "@/hooks/use-theme"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
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
