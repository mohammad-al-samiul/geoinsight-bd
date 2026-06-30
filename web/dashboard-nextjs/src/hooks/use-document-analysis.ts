"use client";

import { useCallback, useState } from "react";
import { apiClient } from "@/lib/api-client";

export interface DocumentAnomaly {
  anomaly_type: string;
  description: string;
  description_bn: string;
  severity: number;
}

export interface DocumentAnalysis {
  clauses: Array<{ clause_type: string; text: string; risk_level: string }>;
  anomalies: DocumentAnomaly[];
  contractor_pattern_match: boolean;
  summary: string;
  summary_bn: string;
}

export function useDocumentAnalysis() {
  const [result, setResult] = useState<DocumentAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(
    async (text: string, docType: "tender" | "contract", contractorNid?: string, lang: "bn" | "en" = "bn") => {
      setLoading(true);
      setError(null);
      try {
        const json = await apiClient<{ success: boolean; data: DocumentAnalysis }>(
          "intelligence/documents/analyze",
          {
            method: "POST",
            body: JSON.stringify({
              text,
              doc_type: docType,
              contractor_nid: contractorNid,
              lang,
            }),
          },
        );
        setResult(json.data);
      } catch (err) {
        setResult(null);
        setError(err instanceof Error ? err.message : "Document analysis failed");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { result, loading, error, analyze };
}
