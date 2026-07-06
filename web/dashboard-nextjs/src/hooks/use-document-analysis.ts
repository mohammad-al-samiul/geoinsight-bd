"use client";

import { useCallback, useState } from "react";
import { apiClient } from "@/lib/api-client";

export interface DocumentAnomaly {
  anomaly_type: string;
  description: string;
  description_bn: string;
  severity: number;
  regulation_ref?: string | null;
}

export interface ExtractedClause {
  clause_type: string;
  label: string;
  label_bn: string;
  text: string;
  risk_level: string;
}

export interface ComplianceCheck {
  code: string;
  label: string;
  label_bn: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  detail_bn: string;
  reference?: string | null;
}

export interface KeyEntity {
  entity_type: string;
  value: string;
  context: string;
}

export interface DocumentAnalysis {
  doc_type: string;
  clauses: ExtractedClause[];
  anomalies: DocumentAnomaly[];
  contractor_pattern_match: boolean;
  summary: string;
  summary_bn: string;
  risk_score: number;
  compliance_status: "COMPLIANT" | "REVIEW_REQUIRED" | "NON_COMPLIANT";
  compliance_checks: ComplianceCheck[];
  key_entities: KeyEntity[];
  recommendations: string[];
  recommendations_bn: string[];
  executive_brief: string;
  executive_brief_bn: string;
  engine?: string;
}

export function useDocumentAnalysis() {
  const [result, setResult] = useState<DocumentAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(
    async (
      text: string,
      docType: "tender" | "contract",
      contractorNid?: string,
      lang: "bn" | "en" = "bn",
    ) => {
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
