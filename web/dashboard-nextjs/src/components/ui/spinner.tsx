import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "h-4 w-4",
  default: "h-5 w-5",
  lg: "h-8 w-8",
} as const;

export function Spinner({
  size = "default",
  label = "Loading",
  className,
}: {
  size?: keyof typeof sizes;
  label?: string;
  className?: string;
}) {
  return (
    <span role="status" aria-label={label} className={cn("inline-flex", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizes[size])} aria-hidden="true" />
    </span>
  );
}
