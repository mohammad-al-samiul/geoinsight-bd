"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

export type PhishingStatus = "RED_FLAG" | "CLEAN" | "WATCH" | "CLEAR" | "ERROR";

export interface PhishingDomainDetails {
  input_url: string;
  hostname: string;
  registrable_domain: string;
  scheme: string;
  is_official: boolean;
  matched_official_domain: string | null;
}

export interface PhishingSignature {
  source_url: string;
  hostname: string;
  registrable_domain: string;
  signature_hash: string;
  captured_at: string;
}

export interface HeuristicAnalysis {
  risk_score: number;
  suspicious_keywords: string[];
  has_excessive_subdomains: boolean;
  has_suspicious_hyphens: boolean;
}

export interface PhishingScanResult {
  status: PhishingStatus;
  similarity_score: number;
  domain_details: PhishingDomainDetails;
  heuristics: HeuristicAnalysis | null;
  best_match: PhishingSignature | null;
  cosine_score: number | null;
  levenshtein_score: number | null;
  message: string;
  error: string | null;
}

export interface OfficialDomainCatalog {
  domains: string[];
  signature_count: number;
  seed_url_count: number;
  seed_urls: string[];
}

export function useAntiPhishing() {
  const [result, setResult] = useState<PhishingScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registerMsg, setRegisterMsg] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<OfficialDomainCatalog | null>(null);

  const refreshCatalog = useCallback(async () => {
    try {
      const json = await apiClient<{ success: boolean; data: OfficialDomainCatalog }>(
        "intelligence/phishing/official-domains",
      );
      setCatalog(json.data);
    } catch {
      // Seed list still works from server register/defaults even if list fails
    }
  }, []);

  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog]);

  const scan = useCallback(async (url: string, similarityThreshold = 0.9) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const json = await apiClient<{ success: boolean; data: PhishingScanResult }>(
        "intelligence/phishing/scan",
        {
          method: "POST",
          body: JSON.stringify({
            url,
            similarity_threshold: similarityThreshold,
            timeout_seconds: 15,
          }),
        },
      );
      setResult(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Phishing scan failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const registerOfficial = useCallback(
    async (urls: string[]) => {
      setLoading(true);
      setError(null);
      setRegisterMsg(null);
      try {
        const json = await apiClient<{
          success: boolean;
          data: {
            registered: PhishingSignature[];
            failed: { url: string; error: string }[];
            official_domains: string[];
          };
        }>("intelligence/phishing/register", {
          method: "POST",
          body: JSON.stringify({ urls, timeout_seconds: 10 }),
        });
        const ok = json.data.registered.length;
        const fail = json.data.failed.length;
        setRegisterMsg(
          `registered=${ok}; failed=${fail}; domains=${json.data.official_domains.length}`,
        );
        await refreshCatalog();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Registration failed");
      } finally {
        setLoading(false);
      }
    },
    [refreshCatalog],
  );

  const registerAllDefaults = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRegisterMsg(null);
    try {
      const json = await apiClient<{
        success: boolean;
        data: {
          registered: PhishingSignature[];
          failed: { url: string; error: string }[];
          official_domains: string[];
        };
      }>("intelligence/phishing/register/defaults", {
        method: "POST",
        body: JSON.stringify({ timeout_seconds: 8 }),
      });
      const ok = json.data.registered.length;
      const fail = json.data.failed.length;
      setRegisterMsg(
        `all_defaults · signatures=${ok}; offline/failed=${fail}; allow_list=${json.data.official_domains.length}`,
      );
      await refreshCatalog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Default registration failed");
    } finally {
      setLoading(false);
    }
  }, [refreshCatalog]);

  return {
    result,
    loading,
    error,
    registerMsg,
    catalog,
    scan,
    registerOfficial,
    registerAllDefaults,
    refreshCatalog,
  };
}
