import * as React from "react";
import { cn } from "@/lib/utils";

export const Badge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "outline" }
>(({ className, variant = "default", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
      variant === "default" && "border-transparent bg-primary/20 text-primary",
      variant === "outline" && "text-foreground",
      className,
    )}
    {...props}
  />
));
Badge.displayName = "Badge";
