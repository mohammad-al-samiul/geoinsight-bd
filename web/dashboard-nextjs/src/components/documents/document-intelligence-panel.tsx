"use client";

import { useState } from "react";
import { useDocumentAnalysis } from "@/hooks/use-document-analysis";
import { ModuleShell } from "@/components/modules/module-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppLang } from "@/hooks/use-app-lang";
import { useTranslations } from "next-intl";
import { FileText, Scan } from "lucide-react";

const SAMPLE_TENDER = `Tender for Road Construction Project — Dhaka District.
Advance payment 45% upon contract signing.
Payment within 5 days of invoice submission.
Single source procurement approved by committee.
Performance bond 5% of contract value.
Contractor NID: 1234567890 — repeat contractor with prior awards.`;

export function DocumentIntelligencePanel() {
  const lang = useAppLang();
  const t = useTranslations("modules.documents");
  const tc = useTranslations("common");
  const [text, setText] = useState(SAMPLE_TENDER);
  const [contractorNid, setContractorNid] = useState("1234567890");
  const { result, loading, error, analyze } = useDocumentAnalysis();

  const handleAnalyze = () =>
    void analyze(text, "tender", contractorNid || undefined, lang);

  return (
    <ModuleShell
      title={t("title")}
      description={t("description")}
      loading={loading && !result}
      error={error}
      onRetry={handleAnalyze}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-panel space-y-3 rounded-xl p-4 shadow-panel">
          <label className="text-xs font-medium text-muted-foreground">{t("documentText")}</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            className="w-full rounded-md border border-border bg-card p-3 text-sm font-mono"
          />
          <input
            placeholder={t("contractorNidPlaceholder")}
            value={contractorNid}
            onChange={(e) => setContractorNid(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm"
          />
          <div className="flex gap-2">
            <Button onClick={handleAnalyze} disabled={loading} className="gap-2">
              <Scan className="h-4 w-4" />
              {tc("analyze")}
            </Button>
          </div>
        </div>

        {result && (
          <div className="space-y-4">
            <div className="glass-panel rounded-xl p-4 shadow-panel">
              <FileText className="mb-2 h-4 w-4 text-primary" />
              <p className="text-sm">{lang === "bn" ? result.summary_bn : result.summary}</p>
              {result.contractor_pattern_match && (
                <Badge className="mt-2 border-red-500/40 bg-red-500/10 text-red-400">
                  {t("contractorPatternMatch")}
                </Badge>
              )}
            </div>

            {result.anomalies.length > 0 && (
              <div className="glass-panel rounded-xl p-4 shadow-panel">
                <h4 className="text-sm font-semibold text-red-400">{t("anomalies")}</h4>
                <ul className="mt-2 space-y-2">
                  {result.anomalies.map((a, i) => (
                    <li key={i} className="text-xs text-muted-foreground">
                      <Badge variant="outline" className="mr-2">
                        S{a.severity}
                      </Badge>
                      {lang === "bn" ? a.description_bn : a.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.clauses.length > 0 && (
              <div className="glass-panel rounded-xl p-4 shadow-panel">
                <h4 className="text-sm font-semibold">{t("extractedClauses")}</h4>
                <ul className="mt-2 space-y-2">
                  {result.clauses.map((c, i) => (
                    <li key={i} className="rounded border border-border/40 p-2 text-xs">
                      <span className="font-medium text-primary">{c.clause_type}</span>
                      <span className="ml-2 text-muted-foreground">({c.risk_level})</span>
                      <p className="mt-1 text-muted-foreground">{c.text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </ModuleShell>
  );
}
