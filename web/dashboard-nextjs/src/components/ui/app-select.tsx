"use client";

import type { ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface AppSelectOption {
  value: string;
  label: string;
}

interface AppSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: AppSelectOption[];
  placeholder?: string;
  /** Leading icon inside the trigger (sort/filter glyphs). */
  icon?: ReactNode;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  size?: "sm" | "default";
  disabled?: boolean;
}

/**
 * Dark-theme select used across command modules.
 * Radix popup — never the OS white native dropdown.
 */
export function AppSelect({
  value,
  onValueChange,
  options,
  placeholder,
  icon,
  className,
  triggerClassName,
  contentClassName,
  size = "sm",
  disabled,
}: AppSelectProps) {
  return (
    <div className={cn("flex min-w-0 items-center", className)}>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          className={cn(
            "border-border/50 bg-background/60 text-foreground shadow-none",
            "hover:bg-background/80 focus:ring-1 focus:ring-primary/50",
            size === "sm" && "h-8 gap-1.5 px-2.5 text-xs font-medium",
            icon && "pl-2",
            triggerClassName,
          )}
        >
          {icon ? <span className="shrink-0 text-muted-foreground">{icon}</span> : null}
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent
          className={cn(
            "border-border/60 bg-card text-foreground shadow-2xl",
            contentClassName,
          )}
        >
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className={cn(size === "sm" && "py-1.5 text-xs")}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
