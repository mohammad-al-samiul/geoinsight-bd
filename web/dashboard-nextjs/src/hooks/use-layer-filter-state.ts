"use client";

import { useCallback, useState } from "react";
import {
  DEFAULT_LAYER_FILTER,
  toggleFilterValue,
  type LayerFilterState,
  type MapLayerId,
  type MarkerSeverity,
  type SignalSource,
  type TimeRange,
} from "@/lib/local-map-layers";

export function useLayerFilterState(initial?: Partial<LayerFilterState>) {
  const [filter, setFilter] = useState<LayerFilterState>({
    ...DEFAULT_LAYER_FILTER,
    ...initial,
  });

  const toggleLayer = useCallback((layer: MapLayerId) => {
    setFilter((prev) => ({ ...prev, layers: toggleFilterValue(prev.layers, layer) }));
  }, []);

  const toggleSource = useCallback((source: SignalSource) => {
    setFilter((prev) => ({ ...prev, sources: toggleFilterValue(prev.sources, source) }));
  }, []);

  const toggleSeverity = useCallback((severity: MarkerSeverity) => {
    setFilter((prev) => ({
      ...prev,
      severities: toggleFilterValue(prev.severities, severity),
    }));
  }, []);

  const setTimeRange = useCallback((timeRange: TimeRange) => {
    setFilter((prev) => ({ ...prev, timeRange }));
  }, []);

  const setWardId = useCallback((wardId: string) => {
    setFilter((prev) => ({ ...prev, wardId }));
  }, []);

  const reset = useCallback(() => {
    setFilter({ ...DEFAULT_LAYER_FILTER, ...initial });
  }, [initial]);

  return {
    filter,
    setFilter,
    toggleLayer,
    toggleSource,
    toggleSeverity,
    setTimeRange,
    setWardId,
    reset,
  };
}
