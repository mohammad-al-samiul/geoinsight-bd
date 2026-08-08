"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { CircleAlert, Layers3, MapPin } from "lucide-react";
import { MapSkeleton } from "@/components/ui/skeleton";
import { getVisibleUnitCount, getUnitScoreOverlayVersion } from "@/lib/geojson-bd";
import { getDrillChildType } from "@/lib/filter-utils";
import { useAdminHierarchy } from "@/hooks/use-admin-hierarchy";
import type { AdminFilterState } from "@/types";
import type { GeoFeatureProperties, RedFlagMarker } from "@/types/dashboard";
import { Badge } from "@/components/ui/badge";

const ChoroplethMapInner = dynamic(
  () =>
    import("@/components/dashboard/choropleth-map-inner").then(
      (m) => m.ChoroplethMapInner,
    ),
  { ssr: false, loading: () => <MapSkeleton /> },
);

interface BangladeshChoroplethMapProps {
  filter: AdminFilterState;
  markers: RedFlagMarker[];
  mapPulseKey?: number;
  onFeatureClick: (props: GeoFeatureProperties) => void;
}

export function BangladeshChoroplethMap({
  filter,
  markers,
  mapPulseKey,
  onFeatureClick,
}: BangladeshChoroplethMapProps) {
  const { ready: hierarchyReady } = useAdminHierarchy();
  const scoreVersion = getUnitScoreOverlayVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- hierarchyReady/scoreVersion invalidate the unit list
  const unitCount = useMemo(
    () => getVisibleUnitCount(filter),
    [filter, hierarchyReady, scoreVersion],
  );
  const geoVersion = `${hierarchyReady ? 1 : 0}-${scoreVersion}`;
  const level = getDrillChildType(filter);

  return (
    <div className="glass-panel map-panel flex h-full min-h-0 flex-col overflow-hidden rounded-xl shadow-panel">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            জাতীয় কর্মদক্ষতা ও ঝুঁকি মানচিত্র
          </h3>
        </div>
        <Badge variant="outline" className="border-primary/30 text-[10px] text-primary">
          {level} level · {unitCount} units
        </Badge>
      </div>

      <div className="relative z-0 min-h-0 flex-1 isolate">
        <ChoroplethMapInner
          filter={filter}
          geoVersion={geoVersion}
          markers={markers}
          mapPulseKey={mapPulseKey}
          onFeatureClick={onFeatureClick}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 px-4 py-2.5 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <Layers3 className="h-3.5 w-3.5 text-primary" />
          এলাকা সীমা
        </span>
        <span className="inline-flex items-center gap-1 text-sky-200">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border border-sky-300/80 bg-sky-500/15" />
          নিরপেক্ষ এলাকা সীমানা
        </span>
        <span className="inline-flex items-center gap-1 text-orange-200">
          <CircleAlert className="h-3 w-3" /> কমলা/লাল marker = সমস্যা ক্লাস্টার
        </span>
        <span className="ml-auto">marker-এ ক্লিক করে সব সমস্যা দেখুন · এলাকায় ক্লিক করে drill-down</span>
      </div>
    </div>
  );
}
