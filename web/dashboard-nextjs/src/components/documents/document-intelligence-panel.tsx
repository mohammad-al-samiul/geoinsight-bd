"use client";

import { useState } from "react";
import { useDocumentAnalysis, type DocumentAnalysis } from "@/hooks/use-document-analysis";
import { ChatMarkdown } from "@/components/chat/chat-markdown";
import { ModuleShell } from "@/components/modules/module-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppLang } from "@/hooks/use-app-lang";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  HelpCircle,
  Scan,
  ShieldAlert,
  XCircle,
} from "lucide-react";

const SAMPLE_TENDER_EN = `Tender Notice — Rural Road Construction, Dhaka District (Package-WR-2025-14)
Estimated contract value: BDT 4,50,00,000 (Four crore fifty lakh).
Advance payment / mobilization advance: 45% upon contract signing.
Performance security: 3% of contract value.
EMD: 2% of estimated cost.
Payment within 5 days of invoice submission.
Single source procurement approved by evaluation committee dated 12/03/2025.
Contractor NID: 1234567890123 — repeat contractor with prior awards in Gazipur.`;

const SAMPLE_TENDER_BN = `টেন্ডার বিজ্ঞপ্তি — গ্রামীণ সড়ক নির্মাণ, ঢাকা জেলা (প্যাকেজ-WR-2025-14)
আনুমানিক চুক্তি মূল্য: BDT 4,50,00,000 (চার কোটি পঞ্চাশ লাখ টাকা)।
অগ্রিম পরিশোধ / মোবিলাইজেশন অগ্রিম: চুক্তি স্বাক্ষরের পর ৪৫%।
পারফরম্যান্স জামানত: চুক্তি মূল্যের ৩%।
টেন্ডার জামানত (ইএমডি): আনুমানিক খরচের ২%।
ইনভয়েস জমার ৫ দিনের মধ্যে পরিশোধ।
মূল্যায়ন কমিটির সিদ্ধান্তে একক উৎস ক্রয় অনুমোদিত — তারিখ ১২/০৩/২০২৫।
ঠিকাদার এনআইডি: ১২৩৪৫৬৭৮৯০১২৩ — গাজীপুরে পূর্বে পুরস্কারপ্রাপ্ত পুনরাবৃত্ত ঠিকাদার।`;

const RISK_COLORS: Record<string, string> = {
  critical: "border-red-500/50 bg-red-500/10 text-red-400",
  high: "border-orange-500/50 bg-orange-500/10 text-orange-400",
  medium: "border-amber-500/50 bg-amber-500/10 text-amber-400",
  low: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
};

const STATUS_STYLES = {
  COMPLIANT: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  REVIEW_REQUIRED: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  NON_COMPLIANT: "border-red-500/40 bg-red-500/10 text-red-400",
};

function ComplianceIcon({ status }: { status: "pass" | "warn" | "fail" }) {
  if (status === "pass") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
  if (status === "fail") return <XCircle className="h-3.5 w-3.5 text-red-400" />;
  return <HelpCircle className="h-3.5 w-3.5 text-amber-400" />;
}

function riskRingColor(score: number): string {
  if (score >= 75) return "text-emerald-400";
  if (score >= 45) return "text-amber-400";
  return "text-red-400";
}

export function DocumentIntelligencePanel() {
  const lang = useAppLang();
  const t = useTranslations("modules.documents");
  const tc = useTranslations("common");
  const [docType, setDocType] = useState<"tender" | "contract">("tender");
  const [text, setText] = useState(lang === "bn" ? SAMPLE_TENDER_BN : SAMPLE_TENDER_EN);
  const [contractorNid, setContractorNid] = useState("1234567890123");
  const { result, loading, error, analyze } = useDocumentAnalysis();

  const handleAnalyze = () =>
    void analyze(text, docType, contractorNid || undefined, lang);

  const loadSample = () => {
    setText(lang === "bn" ? SAMPLE_TENDER_BN : SAMPLE_TENDER_EN);
  };

  const statusLabel = (status: DocumentAnalysis["compliance_status"]) => {
    const key = status as "COMPLIANT" | "REVIEW_REQUIRED" | "NON_COMPLIANT";
    try {
      return t(`status.${key}`);
    } catch {
      return status;
    }
  };

  return (
    <ModuleShell
      title={t("title")}
      description={t("description")}
      loading={loading && !result}
      error={error}
      onRetry={handleAnalyze}
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="glass-panel space-y-4 rounded-xl p-4 shadow-panel">
          <div className="flex flex-wrap gap-2">
            {(["tender", "contract"] as const).map((type) => (
              <Button
                key={type}
                size="sm"
                variant={docType === type ? "default" : "outline"}
                onClick={() => setDocType(type)}
              >
                {t(`docType.${type}`)}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={loadSample} className="ml-auto text-xs">
              {t("loadSample")}
            </Button>
          </div>

          <label className="text-xs font-medium text-muted-foreground">{t("documentText")}</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            className="w-full rounded-md border border-border bg-card p-3 text-sm leading-relaxed"
            placeholder={t("documentPlaceholder")}
          />
          <input
            placeholder={t("contractorNidPlaceholder")}
            value={contractorNid}
            onChange={(e) => setContractorNid(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm"
          />
          <Button onClick={handleAnalyze} disabled={loading || text.length < 50} className="gap-2">
            <Scan className="h-4 w-4" />
            {loading ? t("analyzing") : tc("analyze")}
          </Button>
          {text.length < 50 && (
            <p className="text-[10px] text-muted-foreground">{t("minChars")}</p>
          )}
        </div>

        {result && (
          <div className="space-y-4">
            <div className="glass-panel rounded-xl p-4 shadow-panel">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-16 w-16 flex-col items-center justify-center rounded-full border-2",
                      riskRingColor(result.risk_score),
                    )}
                  >
                    <span className="text-xl font-bold tabular-nums">{result.risk_score}</span>
                    <span className="text-[9px] uppercase">{t("riskScore")}</span>
                  </div>
                  <div>
                    <Badge className={cn("text-[10px]", STATUS_STYLES[result.compliance_status])}>
                      {statusLabel(result.compliance_status)}
                    </Badge>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {lang === "bn" ? result.summary_bn : result.summary}
                    </p>
                    {result.engine === "ollama_enhanced" && (
                      <Badge variant="outline" className="mt-2 text-[9px] text-primary">
                        {t("aiEnhanced")}
                      </Badge>
                    )}
                  </div>
                </div>
                {result.contractor_pattern_match && (
                  <Badge className="border-red-500/40 bg-red-500/10 text-red-400">
                    <ShieldAlert className="mr-1 h-3 w-3" />
                    {t("contractorPatternMatch")}
                  </Badge>
                )}
              </div>
            </div>

            <div className="glass-panel rounded-xl p-4 shadow-panel">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4 text-primary" />
                {t("executiveBrief")}
              </h4>
              <div className="mt-3 rounded-lg border border-border/40 bg-secondary/20 p-3">
                <ChatMarkdown
                  content={
                    lang === "bn"
                      ? result.executive_brief_bn || result.summary_bn
                      : result.executive_brief || result.summary
                  }
                />
              </div>
            </div>

            {result.compliance_checks.length > 0 && (
              <div className="glass-panel rounded-xl p-4 shadow-panel">
                <h4 className="text-sm font-semibold">{t("complianceChecks")}</h4>
                <ul className="mt-3 space-y-2">
                  {result.compliance_checks.map((c) => (
                    <li
                      key={c.code}
                      className="flex gap-2 rounded-lg border border-border/40 bg-secondary/10 p-2.5 text-xs"
                    >
                      <ComplianceIcon status={c.status} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {lang === "bn" ? c.label_bn : c.label}
                        </p>
                        <p className="mt-0.5 text-muted-foreground">
                          {lang === "bn" ? c.detail_bn : c.detail}
                        </p>
                        {c.reference && (
                          <p className="mt-1 text-[10px] text-primary/80">{c.reference}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.anomalies.length > 0 && (
              <div className="glass-panel rounded-xl p-4 shadow-panel">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  {t("anomalies")} ({result.anomalies.length})
                </h4>
                <ul className="mt-3 space-y-2">
                  {result.anomalies.map((a, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-red-500/20 bg-red-500/5 p-2.5 text-xs"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[9px]">
                          S{a.severity}
                        </Badge>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {a.anomaly_type}
                        </span>
                      </div>
                      <p className="mt-1.5 leading-relaxed">
                        {lang === "bn" ? a.description_bn : a.description}
                      </p>
                      {a.regulation_ref && (
                        <p className="mt-1 text-[10px] text-primary/70">{a.regulation_ref}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.key_entities.length > 0 && (
              <div className="glass-panel rounded-xl p-4 shadow-panel">
                <h4 className="text-sm font-semibold">{t("keyEntities")}</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {result.key_entities.map((e, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">
                      {e.entity_type}: {e.value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {result.clauses.length > 0 && (
              <div className="glass-panel rounded-xl p-4 shadow-panel">
                <h4 className="text-sm font-semibold">
                  {t("extractedClauses")} ({result.clauses.length})
                </h4>
                <ul className="mt-3 space-y-2">
                  {result.clauses.map((c, i) => (
                    <li
                      key={i}
                      className={cn(
                        "rounded-lg border p-2.5 text-xs",
                        RISK_COLORS[c.risk_level] ?? RISK_COLORS.low,
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">
                          {lang === "bn" ? c.label_bn : c.label}
                        </span>
                        <span className="rounded bg-background/40 px-1.5 py-0.5 text-[9px] uppercase">
                          {c.risk_level}
                        </span>
                      </div>
                      <p className="mt-1.5 leading-relaxed opacity-90">{c.text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(lang === "bn" ? result.recommendations_bn : result.recommendations).length > 0 && (
              <div className="glass-panel rounded-xl p-4 shadow-panel">
                <h4 className="text-sm font-semibold">{t("recommendations")}</h4>
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-xs text-muted-foreground">
                  {(lang === "bn" ? result.recommendations_bn : result.recommendations).map(
                    (r, i) => (
                      <li key={i} className="leading-relaxed">
                        {r}
                      </li>
                    ),
                  )}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </ModuleShell>
  );
}
