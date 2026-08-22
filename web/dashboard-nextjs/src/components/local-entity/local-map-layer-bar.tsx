"use client";

import { useTranslations } from "next-intl";
import { Layers3, RotateCcw } from "lucide-react";
import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LAYER_COLORS,
  MARKER_SEVERITIES,
  SIGNAL_SOURCES,
  SOURCE_COLORS,
  TIME_RANGES,
  type LayerFilterState,
  type MapLayerId,
  type MarkerSeverity,
  type SignalSource,
  type TimeRange,
} from "@/lib/local-map-layers";

type WardOption = { id: string; name: string; nameBn: string | null };

function Chip({
  active,
  color,
  children,
  onClick,
}: {
  active: boolean;
  color?: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium transition",
        active
          ? "border-primary/40 bg-primary/15 text-primary"
          : "border-border/50 bg-background/40 text-muted-foreground hover:text-foreground",
      )}
      style={
        active && color
          ? { borderColor: `${color}88`, color, background: `${color}22` }
          : undefined
      }
    >
      {color ? (
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      ) : null}
      {children}
    </button>
  );
}

export function LocalMapLayerBar({
  filter,
  layers,
  wards = [],
  isBn,
  onToggleLayer,
  onToggleSource,
  onToggleSeverity,
  onTimeRange,
  onWard,
  onReset,
}: {
  filter: LayerFilterState;
  layers: MapLayerId[];
  wards?: WardOption[];
  isBn?: boolean;
  onToggleLayer: (layer: MapLayerId) => void;
  onToggleSource: (source: SignalSource) => void;
  onToggleSeverity: (severity: MarkerSeverity) => void;
  onTimeRange: (range: TimeRange) => void;
  onWard: (wardId: string) => void;
  onReset: () => void;
}) {
  const t = useTranslations("modules.localMapLayers");

  const layerLabel = (id: MapLayerId) => t(`layer${id}` as "layerPOWER");
  const sourceLabel = (s: SignalSource) =>
    s === "OFFICIAL"
      ? t("sourceOfficial")
      : s === "CITIZEN"
        ? t("sourceCitizen")
        : s === "NEWS"
          ? t("sourceNews")
          : t("sourceAcademic");
  const severityLabel = (s: MarkerSeverity) => t(`sev${s}` as "sevHIGH");
  const timeLabel = (r: TimeRange) => t(`time${r}` as "timeALL");

  const wardOptions = [
    { value: "__all__", label: t("allWards") },
    ...wards.map((w) => ({
      value: w.id,
      label: isBn ? w.nameBn || w.name : w.name,
    })),
  ];

  return (
    <div className="space-y-2 rounded-xl border border-border/50 bg-background/30 p-3">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/30 pb-2">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
          <Layers3 className="h-3.5 w-3.5" />
          {isBn ? "কুইক লেয়ার প্রিসেট:" : "Quick Presets:"}
        </span>
        <button
          type="button"
          onClick={() => onReset()}
          className="rounded border border-border/60 bg-secondary/30 px-2 py-0.5 text-[11px] font-medium text-foreground hover:bg-secondary"
        >
          {isBn ? "সব লেয়ার (All)" : "All Layers"}
        </button>
        <button
          type="button"
          onClick={() => {
            onReset();
            onToggleLayer("UNREST");
          }}
          className="rounded border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-300 hover:bg-amber-500/25"
        >
          🔥 {isBn ? "আন্দোলন (Unrest)" : "Unrest"}
        </button>
        <button
          type="button"
          onClick={() => {
            onReset();
            onToggleLayer("POWER");
            onToggleLayer("DRAINAGE");
            onToggleLayer("ROAD");
            onToggleLayer("WATER");
          }}
          className="rounded border border-sky-500/40 bg-sky-500/15 px-2 py-0.5 text-[11px] font-medium text-sky-300 hover:bg-sky-500/25"
        >
          ⚡ {isBn ? "সিভিক (Civic)" : "Civic Infrastructure"}
        </button>
        <button
          type="button"
          onClick={() => {
            onReset();
            onToggleLayer("CRIME");
            onToggleLayer("CORRUPTION");
          }}
          className="rounded border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-300 hover:bg-red-500/25"
        >
          🛡️ {isBn ? "অপরাধ (Crime)" : "Crime"}
        </button>
        <button
          type="button"
          onClick={() => {
            onReset();
            onToggleLayer("PARTY");
          }}
          className="rounded border border-purple-500/40 bg-purple-500/15 px-2 py-0.5 text-[11px] font-medium text-purple-300 hover:bg-purple-500/25"
        >
          🚩 {isBn ? "দল (Party)" : "Party Politics"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Layers3 className="h-3.5 w-3.5 text-primary" />
          {t("layers")}
        </span>
        {layers.map((id) => (
          <Chip
            key={id}
            active={filter.layers.length === 0 || filter.layers.includes(id)}
            color={LAYER_COLORS[id]}
            onClick={() => onToggleLayer(id)}
          >
            {layerLabel(id)}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t("source")}
        </span>
        {SIGNAL_SOURCES.map((s) => (
          <Chip
            key={s}
            active={filter.sources.length === 0 || filter.sources.includes(s)}
            color={SOURCE_COLORS[s]}
            onClick={() => onToggleSource(s)}
          >
            {sourceLabel(s)}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t("severity")}
        </span>
        {MARKER_SEVERITIES.map((s) => (
          <Chip
            key={s}
            active={filter.severities.length === 0 || filter.severities.includes(s)}
            onClick={() => onToggleSeverity(s)}
          >
            {severityLabel(s)}
          </Chip>
        ))}
        <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t("time")}
        </span>
        {TIME_RANGES.map((r) => (
          <Chip
            key={r}
            active={filter.timeRange === r}
            onClick={() => onTimeRange(r)}
          >
            {timeLabel(r)}
          </Chip>
        ))}
        {wards.length > 0 && (
          <AppSelect
            value={filter.wardId || "__all__"}
            onValueChange={(v) => onWard(v === "__all__" ? "" : v)}
            options={wardOptions}
            triggerClassName="h-7 min-w-[140px] text-[11px]"
          />
        )}
        <Button size="sm" variant="ghost" className="ml-auto h-7 px-2 text-[11px]" onClick={onReset}>
          <RotateCcw className="mr-1 h-3 w-3" />
          {t("reset")}
        </Button>
      </div>
    </div>
  );
}
