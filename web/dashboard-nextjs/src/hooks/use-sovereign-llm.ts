"use client";

import { useCallback, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { AdminFilterState } from "@/types";

export interface LlmChatResponse {
  reply: string;
  provider: string;
  sovereign: boolean;
  model: string;
  lang: string;
}

export function useSovereignLlm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chat = useCallback(
    async (
      messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
      lang: "bn" | "en" = "bn",
      scope?: AdminFilterState,
    ) => {
      setLoading(true);
      setError(null);
      try {
        const json = await apiClient<{ success: boolean; data: LlmChatResponse }>(
          "sovereign-llm/chat",
          {
            method: "POST",
            body: JSON.stringify({
              messages,
              lang,
              divisionId: scope?.divisionId ?? undefined,
              districtId: scope?.districtId ?? undefined,
              upazilaId: scope?.upazilaId ?? undefined,
              unionId: scope?.unionId ?? undefined,
            }),
          },
        );
        return json.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sovereign LLM failed");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { chat, loading, error };
}
