import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-[--color-ring-offset]",
  {
    variants: {
      variant: {
        default: "bg-[--color-primary] text-white hover:bg-[--color-primary-dark]",
        destructive:
          "bg-[--color-destructive] text-[--color-destructive-foreground] hover:bg-[--color-destructive]/90",
        outline:
          "border border-[--color-input] hover:bg-[--color-accent] hover:text-[--color-accent-foreground]",
        secondary:
          "bg-[--color-secondary] text-[--color-secondary-foreground] hover:bg-[--color-secondary]/80",
        ghost: "hover:bg-[--color-accent] hover:text-[--color-accent-foreground]",
        link: "underline-offset-4 hover:underline text-[--color-primary]",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
