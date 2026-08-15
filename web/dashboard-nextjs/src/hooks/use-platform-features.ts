"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

export type PlatformFeatures = {
  fabricEnabled: boolean;
};

const DEFAULTS: PlatformFeatures = { fabricEnabled: false };

let cached: { at: number; value: PlatformFeatures } | null = null;
const TTL_MS = 60_000;

export function usePlatformFeatures(): PlatformFeatures {
  const [features, setFeatures] = useState<PlatformFeatures>(
    cached?.value ?? DEFAULTS,
  );

  useEffect(() => {
    if (cached && Date.now() - cached.at < TTL_MS) {
      setFeatures(cached.value);
      return;
    }
    void apiClient<{ success: boolean; data: PlatformFeatures }>("health/features")
      .then((res) => {
        cached = { at: Date.now(), value: res.data };
        setFeatures(res.data);
      })
      .catch(() => {
        setFeatures(DEFAULTS);
      });
  }, []);

  return features;
}
