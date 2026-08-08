"use client";

import dynamic from "next/dynamic";
import { MapPin, Radio, Shield } from "lucide-react";
import { MapSkeleton } from "@/components/ui/skeleton";
import type { PointCheckResult, ZoneFeature } from "@/hooks/use-proximity-live";
import { cn } from "@/lib/utils";

const ProximityMapInner = dynamic(
  () =>
    import("@/components/proximity/proximity-map-inner").then((m) => m.ProximityMapInner),
  { ssr: false, loading: () => <MapSkeleton /> },
);

interface ProximityMapProps {
  zones: ZoneFeature[];
  tracks: PointCheckResult[];
  pulseKey: number;
  lang: "bn" | "en";
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
}

export function ProximityMap({
  zones,
  tracks,
  pulseKey,
  lang,
  onMapClick,
  className,
}: ProximityMapProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Radio className="h-3.5 w-3.5 text-emerald-400" />
          Live geo-fence (Shapely)
        </span>
        <span className="inline-flex items-center gap-1">
          <Shield className="h-3.5 w-3.5 text-red-400" />
          VIP / government polygon
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-sky-400" />
          Click map to drop analyst pin
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500 ring-1 ring-white/70" />
          INSIDE / alert
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-1 ring-white/70" />
          Clear
        </span>
      </div>
      <div className="glass-panel h-[240px] overflow-hidden rounded-xl shadow-panel sm:h-[340px] lg:h-[520px]">
        <ProximityMapInner
          zones={zones}
          tracks={tracks}
          center={[23.7685, 90.3918]}
          zoom={12}
          pulseKey={pulseKey}
          lang={lang}
          onMapClick={onMapClick}
        />
      </div>
    </div>
  );
}
