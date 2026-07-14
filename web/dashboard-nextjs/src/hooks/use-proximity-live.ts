"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";

export type ProximityStatus = "INSIDE" | "APPROACHING" | "OUTSIDE";

export interface ZoneHit {
  zone_id: string;
  name: string;
  name_bn: string;
  category: string;
  alert_level: string;
  status: ProximityStatus;
  distance_m: number;
  approach_buffer_m: number;
}

export interface TrackPoint {
  lat: number;
  lng: number;
  label?: string | null;
  source?: string | null;
  recorded_at?: string | null;
  track_id?: string | null;
}

export interface PointCheckResult {
  point: TrackPoint;
  hits: ZoneHit[];
  max_severity: string;
  alert: boolean;
}

export interface ZoneFeature {
  zone_id: string;
  name: string;
  name_bn: string;
  category: string;
  alert_level: string;
  approach_buffer_m: number;
  ring_latlng: [number, number][];
}

export interface ProximityLiveSnapshot {
  tracks: PointCheckResult[];
  zones: ZoneFeature[];
  geojson: Record<string, unknown>;
  alert_count: number;
  checked_at: string;
  feed: string;
}

const POLL_MS = 4000;

export function useProximityLive(enabled = true) {
  const [data, setData] = useState<ProximityLiveSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pulseKey, setPulseKey] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const json = await apiClient<{ success: boolean; data: ProximityLiveSnapshot }>(
        "intelligence/proximity/live?include_demo_vips=true",
      );
      if (ac.signal.aborted) return;
      setData(json.data);
      setError(null);
      setPulseKey((k) => k + 1);
    } catch (err) {
      if (ac.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Proximity feed failed");
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, []);

  const checkPoint = useCallback(async (lat: number, lng: number, label?: string) => {
    const json = await apiClient<{
      success: boolean;
      data: { results: PointCheckResult[]; alert_count: number };
    }>("intelligence/proximity/check", {
      method: "POST",
      body: JSON.stringify({
        points: [{ lat, lng, label: label ?? "Analyst pin", source: "manual" }],
      }),
    });
    return json.data;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_MS);
    return () => {
      window.clearInterval(id);
      abortRef.current?.abort();
    };
  }, [enabled, refresh]);

  return { data, loading, error, pulseKey, refresh, checkPoint };
}
