"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";

export interface SearchResult {
  type: "page" | "project" | "representative" | "kpi" | "alert";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export function useGlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setFailed(false);
      return;
    }
    setLoading(true);
    setFailed(false);
    try {
      const json = await apiClient<{
        success: boolean;
        data: { results: SearchResult[]; query: string };
      }>(`search?q=${encodeURIComponent(trimmed)}&limit=20`);
      setResults(json.data?.results ?? []);
    } catch {
      setResults([]);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setFailed(false);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void search(query);
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  return { query, setQuery, results, loading, failed, clear: () => setQuery("") };
}
