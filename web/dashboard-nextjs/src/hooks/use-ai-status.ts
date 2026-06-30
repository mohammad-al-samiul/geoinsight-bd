"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

export interface AiLlmStatus {
  llm_provider: string;
  ollama_url: string | null;
  ollama_model: string;
  ollama_reachable: boolean;
  sovereign_mode: boolean;
  active_provider: string;
}

export function useAiStatus(pollMs = 60_000) {
  const [status, setStatus] = useState<AiLlmStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const json = await apiClient<{ success: boolean; data: AiLlmStatus }>(
        "sovereign-llm/status",
      );
      setStatus(json.data);
      setError(null);
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : "AI status unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  return { status, loading, error, refresh };
}
