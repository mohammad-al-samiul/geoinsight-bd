import * as React from "react";
import { cn } from "@/lib/utils";

export const Badge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "outline" }
>(({ className, variant = "default", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide transition-colors",
      variant === "default" && "border-primary/20 bg-primary/15 text-primary",
      variant === "outline" && "border-border/80 bg-secondary/40 text-foreground/90",
      className,
    )}
    {...props}
  />
));
Badge.displayName = "Badge";
