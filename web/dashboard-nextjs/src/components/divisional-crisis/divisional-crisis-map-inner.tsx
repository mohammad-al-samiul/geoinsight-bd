"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { GeoJSON as GeoJSONLayer, Layer, Path, PathOptions } from "leaflet";
import { BD_MAP_CENTER, BD_MAP_ZOOM } from "@/lib/geojson-bd";
import divisionBoundaries from "@/lib/bd-divisions.json";
import type {
  DivisionCrisisData,
  HighwayCorridor,
  LiveIncidentAlert,
  ShortageKind,
  ShortageSite,
} from "@/lib/divisional-crisis-data";

type DivisionBoundaryFeature = {
  properties: { shapeName: string };
  geometry: Geometry;
};

const NAME_TO_ID: Record<string, string> = {
  dhaka: "dhaka",
  chittagong: "chattogram",
  chattogram: "chattogram",
  khulna: "khulna",
  rajshahi: "rajshahi",
  rajshani: "rajshahi",
  sylhet: "sylhet",
  barishal: "barishal",
  barisal: "barishal",
  rangpur: "rangpur",
  mymensingh: "mymensingh",
};

const KIND_COLORS: Record<ShortageKind, string> = {
  gas: "#f59e0b",
  fuel: "#f97316",
  power: "#a855f7",
  water: "#06b6d4",
};

function canonicalName(name: string): string {
  return name
    .toLowerCase()
    .replace("chittagong", "chattogram")
    .replace("rajshani", "rajshahi")
    .replace("barisal", "barishal")
    .trim();
}

function scoreFill(score: number): string {
  if (score >= 80) return "#dc2626";
  if (score >= 70) return "#d97706";
  if (score >= 60) return "#ca8a04";
  return "#059669";
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

function FitBangladesh() {
  const map = useMap();
  useEffect(() => {
    map.setView(BD_MAP_CENTER, BD_MAP_ZOOM, { animate: false });
    // Bangladesh approximate bounds
    map.fitBounds(
      [
        [20.5, 88.0],
        [26.7, 92.7],
      ],
      { padding: [18, 18], maxZoom: 7.5, animate: false },
    );
  }, [map]);
  return null;
}

export interface DivisionalCrisisMapInnerProps {
  divisions: DivisionCrisisData[];
  selectedDivisionId: string;
  compareDivisionIds?: [string, string] | null;
  sites: ShortageSite[];
  alerts: LiveIncidentAlert[];
  corridors: HighwayCorridor[];
  showCorridors: boolean;
  showAlertPins: boolean;
  activeSiteId: string | null;
  activeAlertId: string | null;
  activeCorridorId: string | null;
  bn: boolean;
  onSelectDivision: (id: string) => void;
  onComparePick?: (id: string) => void;
  onSiteClick: (siteId: string, divisionId: string) => void;
  onAlertClick: (alertId: string, divisionId: string) => void;
  onCorridorClick: (corridorId: string) => void;
}

export function DivisionalCrisisMapInner({
  divisions,
  selectedDivisionId,
  compareDivisionIds = null,
  sites,
  alerts,
  corridors,
  showCorridors,
  showAlertPins,
  activeSiteId,
  activeAlertId,
  activeCorridorId,
  bn,
  onSelectDivision,
  onComparePick,
  onSiteClick,
  onAlertClick,
  onCorridorClick,
}: DivisionalCrisisMapInnerProps) {
  const layerRef = useRef<GeoJSONLayer | null>(null);
  const scoreById = useMemo(() => {
    const map = new Map<string, DivisionCrisisData>();
    for (const d of divisions) map.set(d.id, d);
    return map;
  }, [divisions]);

  const geoJson = useMemo((): FeatureCollection<Geometry, { divisionId: string; nameEn: string }> => {
    const features = (divisionBoundaries.features as unknown as DivisionBoundaryFeature[])
      .filter((f) => f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")
      .map((f) => {
        const key = canonicalName(f.properties.shapeName);
        const divisionId = NAME_TO_ID[key] || key;
        return {
          type: "Feature" as const,
          properties: {
            divisionId,
            nameEn: f.properties.shapeName,
          },
          geometry: f.geometry,
        };
      });
    return { type: "FeatureCollection", features };
  }, []);

  const styleFeature = (feature?: Feature): PathOptions => {
    const divisionId = feature?.properties?.divisionId as string | undefined;
    const div = divisionId ? scoreById.get(divisionId) : undefined;
    const score = div?.overallSeverityScore ?? 50;
    const isSelected = selectedDivisionId === divisionId;
    const isCompareA = compareDivisionIds?.[0] === divisionId;
    const isCompareB = compareDivisionIds?.[1] === divisionId;
    const inCompare = isCompareA || isCompareB;
    const dimmed = Boolean(
      (selectedDivisionId && selectedDivisionId !== "all" && !isSelected && !inCompare) ||
        (compareDivisionIds && !inCompare && selectedDivisionId === "all"),
    );

    return {
      fillColor: scoreFill(score),
      fillOpacity: dimmed ? 0.22 : isSelected || inCompare ? 0.78 : 0.55,
      color: isCompareA ? "#c4b5fd" : isCompareB ? "#67e8f9" : isSelected ? "#ffffff" : "#0f172a",
      weight: isSelected || inCompare ? 2.8 : 1.1,
      dashArray: inCompare ? "6 3" : undefined,
      opacity: 1,
    };
  };

  const onEachFeature = (feature: Feature, layer: Layer) => {
    const divisionId = feature.properties?.divisionId as string;
    const div = scoreById.get(divisionId);
    const score = div?.overallSeverityScore ?? 50;
    const label = bn ? div?.nameBn || divisionId : div?.nameEn || feature.properties?.nameEn;
    layer.bindTooltip(`${label} · ${score}/100`, {
      sticky: true,
      direction: "center",
      className: "divisional-map-tooltip",
    });

    layer.on({
      click: () => onSelectDivision(divisionId),
      dblclick: (e) => {
        e.originalEvent?.preventDefault?.();
        onComparePick?.(divisionId);
      },
      mouseover: (e) => {
        const path = e.target as Path;
        path.setStyle({ weight: 3, fillOpacity: 0.82 });
        path.bringToFront();
      },
      mouseout: (e) => {
        const path = e.target as Path;
        path.setStyle(styleFeature(feature));
      },
    });
  };

  // Refresh choropleth styles when scores / selection change
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.setStyle((feature) => styleFeature(feature));
  }, [divisions, selectedDivisionId, compareDivisionIds]);

  return (
    <MapContainer
      center={BD_MAP_CENTER}
      zoom={BD_MAP_ZOOM}
      className="h-full w-full rounded-xl"
      scrollWheelZoom
      zoomControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <MapResizeSync />
      <FitBangladesh />

      <GeoJSON
        key="bd-divisions"
        data={geoJson}
        style={styleFeature}
        onEachFeature={onEachFeature}
        ref={(ref) => {
          layerRef.current = ref;
        }}
      />

      {showCorridors
        ? corridors.map((corridor) => (
            <Polyline
              key={corridor.id}
              positions={corridor.path}
              pathOptions={{
                color: activeCorridorId === corridor.id ? "#38bdf8" : "#0ea5e9",
                weight: activeCorridorId === corridor.id ? 5 : 3.5,
                opacity: activeCorridorId === corridor.id ? 0.95 : 0.65,
                dashArray: "2 8",
              }}
              eventHandlers={{
                click: (e) => {
                  e.originalEvent.stopPropagation();
                  onCorridorClick(corridor.id);
                },
              }}
            >
              <Tooltip sticky>
                {bn ? corridor.nameBn : corridor.nameEn}
              </Tooltip>
            </Polyline>
          ))
        : null}

      {sites.map((site) => {
        const active = activeSiteId === site.id;
        const r =
          site.severity === "critical" ? 9 : site.severity === "high" ? 7.5 : 6;
        return (
          <CircleMarker
            key={site.id}
            center={[site.lat, site.lng]}
            radius={active ? r + 2 : r}
            pathOptions={{
              color: "#0f172a",
              weight: active ? 2.5 : 1.5,
              fillColor: KIND_COLORS[site.kind],
              fillOpacity: 0.95,
            }}
            eventHandlers={{
              click: (e) => {
                e.originalEvent.stopPropagation();
                onSiteClick(site.id, site.divisionId);
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -4]}>
              <span className="font-semibold">
                {bn ? site.nameBn : site.nameEn}
              </span>
            </Tooltip>
          </CircleMarker>
        );
      })}

      {showAlertPins
        ? alerts
            .filter((a) => typeof a.lat === "number" && typeof a.lng === "number")
            .map((alert) => {
              const active = activeAlertId === alert.id;
              return (
                <CircleMarker
                  key={alert.id}
                  center={[alert.lat!, alert.lng!]}
                  radius={active ? 8 : 6}
                  pathOptions={{
                    color: "#fff",
                    weight: active ? 2 : 1,
                    fillColor:
                      alert.source === "citizen"
                        ? "#f472b6"
                        : alert.severity === "critical"
                          ? "#f43f5e"
                          : "#fb7185",
                    fillOpacity: 0.95,
                  }}
                  eventHandlers={{
                    click: (e) => {
                      e.originalEvent.stopPropagation();
                      onAlertClick(alert.id, alert.divisionId);
                    },
                  }}
                >
                  <Tooltip>
                    {bn ? alert.titleBn : alert.titleEn}
                  </Tooltip>
                </CircleMarker>
              );
            })
        : null}
    </MapContainer>
  );
}
