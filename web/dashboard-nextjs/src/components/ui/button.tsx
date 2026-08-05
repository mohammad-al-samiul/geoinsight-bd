import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold tracking-tight transition-shadow duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "relative overflow-hidden btn-gradient text-primary-foreground shadow-soft hover:shadow-glow border border-white/10",
        secondary:
          "bg-secondary text-secondary-foreground border border-border/70 hover:border-border hover:bg-secondary/85",
        destructive:
          "bg-destructive text-destructive-foreground border border-destructive/40 hover:bg-destructive/90",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        outline:
          "border border-border/80 bg-transparent hover:border-primary/40 hover:bg-primary/10",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        icon: "h-9 w-9",
        lg: "h-11 px-6 text-[15px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, disabled, children, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size, className }));

    if (asChild) {
      return (
        <Slot className={classes} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }

    return (
      <motion.button
        ref={ref}
        className={classes}
        disabled={disabled}
        whileHover={disabled ? undefined : { y: -1, scale: 1.015 }}
        whileTap={disabled ? undefined : { scale: 0.97 }}
        transition={{ type: "spring", stiffness: 420, damping: 24 }}
        {...(props as React.ComponentProps<typeof motion.button>)}
      >
        {variant === "default" && (
          <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
            <span className="btn-sheen" />
          </span>
        )}
        <span className="relative z-[1] inline-flex items-center gap-2">{children}</span>
      </motion.button>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
