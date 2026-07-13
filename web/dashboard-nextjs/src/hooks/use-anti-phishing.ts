"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api-client";

export interface AntiPhishingScan {
  scanned_url: string;
  scanned_domain: string;
  official_domain: string | null;
  official_name: string | null;
  official_name_bn: string | null;
  similarity_score: number;
  digital_signature: string;
  verified_official: boolean;
  risk_level: "SAFE" | "REVIEW" | "RED_FLAG";
  red_flag: boolean;
  reasons: string[];
  reasons_bn: string[];
  scanned_at: string;
  engine: string;
}

export function useAntiPhishing() {
  const [result, setResult] = useState<AntiPhishingScan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = async (url: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient<{ success: boolean; data: AntiPhishingScan }>(
        "anti-phishing/scan",
        { method: "POST", body: JSON.stringify({ url }) },
      );
      setResult(response.data);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Domain analysis unavailable");
    } finally {
      setLoading(false);
    }
  };

  return { result, loading, error, scan };
}
