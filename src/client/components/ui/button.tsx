import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Loader2Icon } from "lucide-react"
import { Slot } from "radix-ui"

// Shape, outline, resting shadow and press feedback come from the personality
// (rounded-control, edge-*, elevate-sm, press; see theme/personalities.css).
const buttonVariants = cva(
  "group/button press inline-flex shrink-0 items-center justify-center rounded-control bg-clip-padding font-semibold whitespace-nowrap outline-none select-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-3 aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: "edge-ink elevate-sm bg-primary text-primary-foreground hover:bg-primary/85",
        outline:
          "edge-control elevate-sm bg-(--outline-fill) text-foreground hover:bg-accent aria-expanded:bg-accent",
        secondary:
          "edge-ink elevate-sm bg-secondary text-secondary-foreground hover:bg-secondary/85 aria-expanded:bg-secondary",
        ghost: "text-foreground hover:bg-muted aria-expanded:bg-muted",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:ring-destructive/40",
        link: "h-auto px-0 text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:decoration-foreground",
      },
      size: {
        default: "h-11 gap-2 px-5 text-base",
        xs: "h-8 gap-1 px-2.5 text-sm [&_svg:not([class*='size-'])]:size-4",
        sm: "h-9 gap-1.5 px-3.5 text-sm [&_svg:not([class*='size-'])]:size-4",
        lg: "h-12 gap-2 px-6 text-base",
        icon: "size-11",
        "icon-xs": "size-8 [&_svg:not([class*='size-'])]:size-4",
        "icon-sm": "size-9 [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Shows a spinner, keeps the label, and blocks clicks. */
    loading?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      aria-busy={loading || undefined}
      disabled={asChild ? undefined : disabled || loading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Loader2Icon className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
          {children}
        </>
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
