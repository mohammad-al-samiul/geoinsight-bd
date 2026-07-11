"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { arcLatLngs, BD_TRADE_HUB } from "@/lib/country-coordinates";
import type { TradeFlow } from "@/types/dashboard";
import { cn } from "@/lib/utils";
import { MapSkeleton } from "@/components/ui/skeleton";

const WORLD_CENTER: LatLngExpression = [22, 65];
const WORLD_ZOOM = 3;

interface TradeFlowMapInnerProps {
  flows: TradeFlow[];
  selectedCommodity: string | null;
  pulseKey?: number;
}

function MapResizeSync() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer().parentElement;
    if (!container) return;
    const sync = () => map.invalidateSize({ animate: false });
    const timer = window.setTimeout(sync, 0);
    const observer = new ResizeObserver(sync);
    observer.observe(container);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [map]);
  return null;
}

function FlowLine({
  flow,
  highlighted,
}: {
  flow: TradeFlow;
  highlighted: boolean;
}) {
  const from: [number, number] =
    flow.flowType === "import"
      ? [flow.countryLat, flow.countryLng]
      : BD_TRADE_HUB;
  const to: [number, number] =
    flow.flowType === "import"
      ? BD_TRADE_HUB
      : [flow.countryLat, flow.countryLng];

  const positions = arcLatLngs(from, to);
  const color = flow.flowType === "import" ? "#10b981" : "#fbbf24";
  const weight = highlighted ? 4 : 2 + Math.min(flow.marginPct / 6, 2);

  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color,
        weight,
        opacity: highlighted ? 0.95 : 0.55,
        className:
          flow.flowType === "import"
            ? "trade-flow-line trade-flow-import"
            : "trade-flow-line trade-flow-export",
      }}
    >
      <Tooltip sticky className="geo-tooltip">
        <strong>
          {flow.flowType === "import" ? "↓ Import" : "↑ Export"}: {flow.commodity}
        </strong>
        <br />
        {flow.countryName} ↔ Bangladesh
        <br />
        Margin: <strong>{flow.marginPct}%</strong>
        {flow.landedCostUsd > 0 && (
          <>
            <br />
            Landed: ${flow.landedCostUsd.toFixed(0)}/MT
          </>
        )}
      </Tooltip>
    </Polyline>
  );
}

export function TradeFlowMapInner({
  flows,
  selectedCommodity,
  pulseKey,
}: TradeFlowMapInnerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const visible = useMemo(() => {
    if (!selectedCommodity) return flows;
    return flows.filter((f) => f.commodity === selectedCommodity);
  }, [flows, selectedCommodity]);

  const countryMarkers = useMemo(() => {
    const seen = new Map<string, TradeFlow>();
    for (const f of visible) {
      if (!seen.has(f.countryCode)) seen.set(f.countryCode, f);
    }
    return [...seen.values()];
  }, [visible]);

  if (!mounted) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
        <MapSkeleton />
      </div>
    );
  }

  return (
    <div
      className={cn("absolute inset-0", pulseKey ? "animate-map-flash" : "")}
    >
      <MapContainer
        center={WORLD_CENTER}
        zoom={WORLD_ZOOM}
        minZoom={2}
        maxZoom={8}
        className="h-full w-full rounded-lg"
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        attributionControl={false}
        worldCopyJump
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <MapResizeSync />

        {visible.map((flow) => (
          <FlowLine
            key={flow.id}
            flow={flow}
            highlighted={
              !selectedCommodity || flow.commodity === selectedCommodity
            }
          />
        ))}

        <CircleMarker
          center={BD_TRADE_HUB}
          radius={10}
          pathOptions={{
            color: "#34d399",
            fillColor: "#10b981",
            fillOpacity: 0.9,
            weight: 3,
            className: "bd-hub-pulse",
          }}
        >
          <Tooltip permanent direction="top" offset={[0, -12]} className="geo-tooltip">
            <strong>Bangladesh</strong>
            <br />
            Trade hub
          </Tooltip>
        </CircleMarker>

        {countryMarkers.map((flow) => (
          <CircleMarker
            key={flow.countryCode}
            center={[flow.countryLat, flow.countryLng]}
            radius={6}
            pathOptions={{
              color: flow.flowType === "import" ? "#10b981" : "#fbbf24",
              fillColor: flow.flowType === "import" ? "#059669" : "#d97706",
              fillOpacity: 0.85,
              weight: 2,
            }}
          >
            <Tooltip className="geo-tooltip">
              <strong>{flow.countryName}</strong>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
