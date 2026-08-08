"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { BD_MAP_CENTER, BD_MAP_ZOOM, getMapBoundsForFilter } from "@/lib/geojson-bd";
import type { AdminFilterState } from "@/types";
import type { AgroMarketRow } from "@/lib/module-types";
import { MapSkeleton } from "@/components/ui/skeleton";

const MARKET_COLOR: Record<string, string> = {
  WHOLESALE: "#10b981",
  RETAIL: "#38bdf8",
  HAAT: "#f59e0b",
  MANDI: "#a78bfa",
};

function MapBoundsSync({ filter }: { filter: AdminFilterState }) {
  const map = useMap();

  useEffect(() => {
    const bounds = getMapBoundsForFilter(filter);
    if (bounds) {
      map.fitBounds(bounds, {
        padding: [24, 24],
        maxZoom: filter.upazilaId ? 12 : filter.districtId ? 11 : filter.divisionId ? 9 : 8,
        animate: true,
      });
    } else {
      map.setView(BD_MAP_CENTER, BD_MAP_ZOOM, { animate: true });
    }
  }, [filter, map]);

  return null;
}

function MapResizeSync() {
  const map = useMap();

  useEffect(() => {
    const parent = map.getContainer().parentElement;
    if (!parent) return;
    const sync = () => map.invalidateSize({ animate: false });
    const timer = window.setTimeout(sync, 0);
    const observer = new ResizeObserver(sync);
    observer.observe(parent);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [map]);

  return null;
}

function price(value: AgroMarketRow["priceBdtPerKg"]) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `৳${amount.toFixed(2)}/কেজি` : "মূল্য সিঙ্ক হচ্ছে";
}

export function AgroMarketsMapInner({
  filter,
  markets,
}: {
  filter: AdminFilterState;
  markets: AgroMarketRow[];
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const validMarkets = useMemo(
    () =>
      markets.filter(
        (market) => Number.isFinite(Number(market.lat)) && Number.isFinite(Number(market.lng)),
      ),
    [markets],
  );

  if (!mounted) return <MapSkeleton />;

  return (
    <MapContainer
      center={BD_MAP_CENTER as LatLngExpression}
      zoom={BD_MAP_ZOOM}
      minZoom={6}
      maxZoom={14}
      scrollWheelZoom
      attributionControl={false}
      className="h-full w-full"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />
      <MapBoundsSync filter={filter} />
      <MapResizeSync />

      {validMarkets.map((market) => {
        const color = MARKET_COLOR[market.type] ?? "#34d399";
        const hasPrice = Number.isFinite(Number(market.priceBdtPerKg));
        return (
          <CircleMarker
            key={market.id}
            center={[Number(market.lat), Number(market.lng)]}
            radius={hasPrice ? 9 : 6}
            pathOptions={{
              color: "#f8fafc",
              weight: 1.5,
              fillColor: color,
              fillOpacity: 0.9,
              className: hasPrice ? "agro-market-pulse" : undefined,
            }}
          >
            <Tooltip sticky direction="top" offset={[0, -8]} className="geo-tooltip">
              <strong>{market.name}</strong>
              <br />
              {market.type} · {price(market.priceBdtPerKg)}
              {market.commodityCode && (
                <>
                  <br />
                  পণ্য: {market.commodityCode.toLowerCase()}
                </>
              )}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
