/**
 * Shared map-layer engine for Local DSS (Mayor / MP).
 * Filters pins by layer, source, severity, ward, and time window.
 */

export const SIGNAL_SOURCES = ["OFFICIAL", "CITIZEN", "NEWS", "ACADEMIC"] as const;
export type SignalSource = (typeof SIGNAL_SOURCES)[number];

export const MAP_LAYERS = [
  "POWER",
  "GAS",
  "FUEL",
  "WATER",
  "DRAINAGE",
  "ROAD",
  "INTERNET",
  "COMPLAINT",
  "CRIME",
  "CORRUPTION",
  "EDUCATION",
  "HEALTH",
  "UNEMPLOYMENT",
  "UNREST",
  "OTHER",
] as const;
export type MapLayerId = (typeof MAP_LAYERS)[number];

export const UNREST_LAYERS: MapLayerId[] = ["UNREST"];

export const EDUCATION_LAYERS: MapLayerId[] = ["EDUCATION"];
export const HEALTH_LAYERS: MapLayerId[] = ["HEALTH"];
export const JOBS_LAYERS: MapLayerId[] = ["UNEMPLOYMENT"];
export const CRIME_LAYERS: MapLayerId[] = ["CRIME"];
export const CORRUPTION_LAYERS: MapLayerId[] = ["CORRUPTION"];

export const COMMAND_LAYERS: MapLayerId[] = [...MAP_LAYERS];

export const OUTAGE_LAYERS: MapLayerId[] = [
  "POWER",
  "GAS",
  "FUEL",
  "WATER",
  "DRAINAGE",
  "ROAD",
  "INTERNET",
  "OTHER",
];

export const COMPLAINT_LAYERS: MapLayerId[] = [
  "COMPLAINT",
  "CRIME",
  "CORRUPTION",
  "EDUCATION",
  "HEALTH",
  "UNEMPLOYMENT",
  "DRAINAGE",
  "ROAD",
  "OTHER",
];

export const MARKER_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type MarkerSeverity = (typeof MARKER_SEVERITIES)[number];

export const TIME_RANGES = ["NOW", "TODAY", "7D", "30D", "ALL"] as const;
export type TimeRange = (typeof TIME_RANGES)[number];

export const LAYER_COLORS: Record<MapLayerId, string> = {
  POWER: "#fbbf24",
  GAS: "#f97316",
  FUEL: "#fb7185",
  WATER: "#38bdf8",
  DRAINAGE: "#22d3ee",
  ROAD: "#a78bfa",
  INTERNET: "#818cf8",
  COMPLAINT: "#f87171",
  CRIME: "#ef4444",
  CORRUPTION: "#c084fc",
  EDUCATION: "#34d399",
  HEALTH: "#2dd4bf",
  UNEMPLOYMENT: "#f59e0b",
  UNREST: "#fb923c",
  OTHER: "#94a3b8",
};

export const SOURCE_COLORS: Record<SignalSource, string> = {
  OFFICIAL: "#38bdf8",
  CITIZEN: "#34d399",
  NEWS: "#fbbf24",
  ACADEMIC: "#c084fc",
};

export type LayerEvent = {
  id: string;
  layer: MapLayerId;
  lat: number;
  lng: number;
  severity: MarkerSeverity;
  source: SignalSource;
  occurredAt: string;
  wardId?: string | null;
  label: string;
  kind?: string;
};

export type LayerFilterState = {
  /** Empty = all layers */
  layers: MapLayerId[];
  /** Empty = all sources */
  sources: SignalSource[];
  /** Empty = all severities */
  severities: MarkerSeverity[];
  wardId: string;
  timeRange: TimeRange;
};

export const DEFAULT_LAYER_FILTER: LayerFilterState = {
  layers: [],
  sources: [],
  severities: [],
  wardId: "",
  timeRange: "ALL",
};

export function outageKindToLayer(kind: string): MapLayerId {
  if ((OUTAGE_LAYERS as string[]).includes(kind)) return kind as MapLayerId;
  return "OTHER";
}

export function complaintCategoryToLayer(category: string): MapLayerId {
  switch (category) {
    case "UTILITIES":
      return "POWER";
    case "CRIME":
      return "CRIME";
    case "CORRUPTION":
      return "CORRUPTION";
    case "EDUCATION":
      return "EDUCATION";
    case "HEALTH":
      return "HEALTH";
    case "UNEMPLOYMENT":
      return "UNEMPLOYMENT";
    case "DRAINAGE":
      return "DRAINAGE";
    case "TRAFFIC":
    case "INFRASTRUCTURE":
      return "ROAD";
    case "SAFETY":
      return "CRIME";
    default:
      return "COMPLAINT";
  }
}

export function severityFromOutage(n: number): MarkerSeverity {
  if (n >= 5) return "CRITICAL";
  if (n >= 4) return "HIGH";
  if (n >= 3) return "MEDIUM";
  return "LOW";
}

export function isSignalSource(value: string | null | undefined): value is SignalSource {
  return Boolean(value && (SIGNAL_SOURCES as readonly string[]).includes(value));
}

function timeRangeStart(range: TimeRange, now = Date.now()): number | null {
  if (range === "ALL") return null;
  if (range === "NOW") return now - 3 * 60 * 60 * 1000;
  if (range === "TODAY") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (range === "7D") return now - 7 * 24 * 60 * 60 * 1000;
  return now - 30 * 24 * 60 * 60 * 1000;
}

export function eventMatchesFilter(
  event: LayerEvent,
  filter: LayerFilterState,
  now = Date.now(),
): boolean {
  if (filter.layers.length && !filter.layers.includes(event.layer)) return false;
  if (filter.sources.length && !filter.sources.includes(event.source)) return false;
  if (filter.severities.length && !filter.severities.includes(event.severity)) return false;
  if (filter.wardId && event.wardId !== filter.wardId) return false;
  const start = timeRangeStart(filter.timeRange, now);
  if (start != null) {
    const ts = Date.parse(event.occurredAt);
    if (!Number.isFinite(ts) || ts < start) return false;
  }
  return true;
}

export function filterLayerEvents(
  events: LayerEvent[],
  filter: LayerFilterState,
  now = Date.now(),
): LayerEvent[] {
  return events.filter((e) => eventMatchesFilter(e, filter, now));
}

export function toggleFilterValue<T>(selected: T[], value: T): T[] {
  return selected.includes(value)
    ? selected.filter((v) => v !== value)
    : [...selected, value];
}
