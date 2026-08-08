import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "outline"
  | "success"
  | "warning"
  | "destructive"
  | "info";

const badgeStyles: Record<BadgeVariant, string> = {
  default: "border-primary/20 bg-primary/15 text-primary",
  outline: "border-border/80 bg-secondary/40 text-foreground/90",
  success: "border-emerald-500/25 bg-emerald-500/12 text-emerald-400",
  warning: "border-amber-500/25 bg-amber-500/12 text-amber-400",
  destructive: "border-red-500/25 bg-red-500/12 text-red-400",
  info: "border-sky-500/25 bg-sky-500/12 text-sky-400",
};

export const Badge = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }
>(({ className, variant = "default", ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide transition-colors",
      badgeStyles[variant],
      className,
    )}
    {...props}
  />
));
Badge.displayName = "Badge";
