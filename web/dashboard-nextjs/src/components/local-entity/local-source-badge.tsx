"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { SignalSource } from "@/lib/local-map-layers";
import { SOURCE_COLORS } from "@/lib/local-map-layers";

export function LocalSourceBadge({
  source,
  className,
}: {
  source?: SignalSource | string | null;
  className?: string;
}) {
  const t = useTranslations("modules.localMapLayers");
  const key = (source ?? "OFFICIAL") as SignalSource;
  const color = SOURCE_COLORS[key] ?? SOURCE_COLORS.OFFICIAL;
  const label =
    key === "OFFICIAL"
      ? t("sourceOfficial")
      : key === "CITIZEN"
        ? t("sourceCitizen")
        : key === "NEWS"
          ? t("sourceNews")
          : key === "ACADEMIC"
            ? t("sourceAcademic")
            : key;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        className,
      )}
      style={{ borderColor: `${color}66`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
