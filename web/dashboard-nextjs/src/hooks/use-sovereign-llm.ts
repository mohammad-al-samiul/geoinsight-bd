"use client";

import { useCallback, useState } from "react";
import { apiClient } from "@/lib/api-client";

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
      context?: string,
    ) => {
      setLoading(true);
      setError(null);
      try {
        const json = await apiClient<{ success: boolean; data: LlmChatResponse }>(
          "sovereign-llm/chat",
          {
            method: "POST",
            body: JSON.stringify({ messages, lang, context }),
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
