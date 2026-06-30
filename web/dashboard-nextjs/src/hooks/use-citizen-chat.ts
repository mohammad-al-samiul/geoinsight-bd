"use client";

import { useCallback, useState } from "react";

export interface CitizenChatReply {
  category: string;
  confidence: number;
  route_ministry: string;
  route_ministry_bn: string;
  route_district: string | null;
  reply: string;
  reply_bn: string;
  channel: string;
  sovereign: boolean;
}

export function useCitizenChat(channel: "333" | "999" = "333") {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (message: string, lang: "bn" | "en" = "bn", district?: string) => {
      setLoading(true);
      setError(null);
      try {
        const path = channel === "999" ? "citizen/chat/999" : "citizen/chat";
        const res = await fetch(`/api/proxy/${path}`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, lang, district }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message ?? "Chat failed");
        return json.data as CitizenChatReply;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chat failed");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [channel],
  );

  return { send, loading, error };
}
