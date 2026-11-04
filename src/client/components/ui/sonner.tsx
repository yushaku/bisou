import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"
import { useTheme } from "@/theme/ThemeProvider"

const Toaster = ({ ...props }: ToasterProps) => {
  const { kind } = useTheme()

  return (
    <Sonner
      theme={kind}
      className="toaster group"
      position="top-center"
      offset={{ top: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      mobileOffset={{ top: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      icons={{
        success: <CircleCheckIcon className="size-5 text-success" />,
        info: <InfoIcon className="size-5 text-info" />,
        warning: <TriangleAlertIcon className="size-5 text-warning" />,
        error: <OctagonXIcon className="size-5 text-destructive" />,
        loading: <Loader2Icon className="size-5 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast edge elevate font-sans text-base",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
