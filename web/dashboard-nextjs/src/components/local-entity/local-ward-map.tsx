"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Layers3, MapPinned } from "lucide-react";
import { MapSkeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  buildLocalWardGeoJson,
  resolveEntityMapMeta,
  type LocalWardRef,
  type LocalWardScore,
} from "@/lib/local-ward-geo";
import type { LocalMapMarker } from "@/components/local-entity/local-ward-map-inner";
import { cn } from "@/lib/utils";

const LocalWardMapInner = dynamic(
  () =>
    import("@/components/local-entity/local-ward-map-inner").then(
      (m) => m.LocalWardMapInner,
    ),
  { ssr: false, loading: () => <MapSkeleton /> },
);

interface LocalWardMapProps {
  entityCode: string;
  wards: LocalWardRef[];
  scores?: LocalWardScore[];
  markers?: LocalMapMarker[];
  className?: string;
  heightClassName?: string;
  title?: string;
  metricLabel?: string;
}

function desktopOnlyHeight(className: string) {
  return className
    .split(/\s+/)
    .filter(Boolean)
    .map((token) =>
      /^(sm:|md:|lg:|xl:|2xl:|max-)/.test(token) ? token : `sm:${token}`,
    )
    .join(" ");
}

export function LocalWardMap({
  entityCode,
  wards,
  scores = [],
  markers = [],
  className,
  heightClassName = "min-h-[320px] h-[360px]",
  title,
  metricLabel,
}: LocalWardMapProps) {
  const t = useTranslations("modules.localViz");
  const locale = useLocale();
  const isBn = locale.startsWith("bn");
  const meta = resolveEntityMapMeta(entityCode);

  const geo = useMemo(
    () => buildLocalWardGeoJson(entityCode, wards, scores),
    [entityCode, wards, scores],
  );

  return (
    <div
      className={cn(
        "glass-panel map-panel flex flex-col overflow-hidden rounded-xl shadow-panel",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <MapPinned className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {title ?? t("wardMap")}
            </h3>
            <p className="truncate text-[10px] text-muted-foreground">
              {isBn ? meta.labelBn : meta.labelEn} ·{" "}
              {meta.districtName === "Chittagong"
                ? isBn
                  ? "চট্টগ্রাম জেলা"
                  : "Chattogram district"
                : isBn
                  ? "কুমিল্লা জেলা"
                  : "Cumilla district"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <Badge
            variant="outline"
            className="border-sky-400/40 text-[10px] text-sky-200"
          >
            {t("legendBd")}
          </Badge>
          <Badge
            variant="outline"
            style={{ borderColor: `${meta.accent}88`, color: meta.accent }}
            className="text-[10px]"
          >
            {meta.role} · {entityCode}
          </Badge>
          <Badge variant="outline" className="border-primary/30 text-[10px] text-primary">
            {wards.length} {t("wards")}
          </Badge>
        </div>
      </div>

      <div
        className={cn(
          "relative z-0 isolate h-[min(52dvh,22rem)] min-h-[13.5rem]",
          desktopOnlyHeight(heightClassName),
        )}
      >
        {wards.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            —
          </div>
        ) : (
          <LocalWardMapInner
            entityCode={entityCode}
            geo={geo}
            markers={markers}
            metricLabel={metricLabel ?? t("wpiScore")}
            isBn={isBn}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 px-4 py-2.5 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <Layers3 className="h-3.5 w-3.5 text-primary" />
          {t("mapLegend")}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border border-sky-300/80 bg-sky-500/20" />
          {t("legendBd")}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border border-amber-300/80 bg-amber-400/25" />
          {t("legendDistrict")}
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: meta.accent }}
          />
          {meta.role === "MP" ? t("legendMp") : t("legendMayor")}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-400/80" />
          WPI
        </span>
        <span className="ml-auto">{t("mapHint")}</span>
      </div>
      <p className="border-t border-border/40 px-4 py-1.5 text-[10px] text-muted-foreground/80">
        {t("mapFootnote")}
      </p>
    </div>
  );
}
